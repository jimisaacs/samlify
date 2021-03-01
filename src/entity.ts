/**
 * @file entity.ts
 * @author tngan
 * @desc  An abstraction for identity provider and service provider.
 */
import { v4 as uuid } from 'uuid';
import postBinding from './binding-post';
import redirectBinding from './binding-redirect';
import { SamlifyError, SamlifyErrorCode } from './error';
import { flow, FlowResult } from './flow';
import type { CustomTagReplacement } from './libsaml';
import type { Metadata } from './metadata';
import type { EntitySettings, ParsedLogoutRequest, ParsedLogoutResponse } from './types';
import { algorithms, BindingNamespace, messageConfigurations, ParserType } from './urn';
import { isNonEmptyArray, isString } from './utility';

const dataEncryptionAlgorithm = algorithms.encryption.data;
const keyEncryptionAlgorithm = algorithms.encryption.key;
const signatureAlgorithms = algorithms.signature;
const messageSigningOrders = messageConfigurations.signingOrder;

const defaultEntitySetting = {
	wantLogoutResponseSigned: false,
	messageSigningOrder: messageSigningOrders.SIGN_THEN_ENCRYPT,
	wantLogoutRequestSigned: false,
	allowCreate: false,
	isAssertionEncrypted: false,
	requestSignatureAlgorithm: signatureAlgorithms.RSA_SHA256,
	dataEncryptionAlgorithm: dataEncryptionAlgorithm.AES_256,
	keyEncryptionAlgorithm: keyEncryptionAlgorithm.RSA_OAEP_MGF1P,
	generateID: (): string => `_${uuid()}`,
	relayState: '',
} as const;

export interface ESamlHttpRequest {
	query?: any;
	body?: any;
	octetString?: string;
}

export interface BindingContext {
	context: string;
	id: string;
}

export interface PostBindingContext extends BindingContext {
	relayState?: string;
	entityEndpoint: string;
	type: 'SAMLRequest' | 'SAMLResponse';
}

export interface ParseResult {
	samlContent: string;
	extract: any;
	sigAlg: string;
}

export class Entity<Settings extends EntitySettings = EntitySettings, Meta extends Metadata = Metadata> {
	protected entitySettings: Settings;
	/**
	 * @param entitySettings
	 * @param Meta
	 */
	constructor(entitySettings: Settings, protected entityMeta: Meta) {
		// setting with metadata has higher precedence
		entitySettings.nameIDFormat = entityMeta.getNameIDFormat() || entitySettings.nameIDFormat;
		this.entitySettings = Object.assign({}, defaultEntitySetting, entitySettings);
	}
	/**
	 * @desc  Returns the setting of entity
	 * @return {string}
	 */
	generateID(): string {
		if (this.entitySettings.generateID) return this.entitySettings.generateID();
		return defaultEntitySetting.generateID();
	}
	/**
	 * @desc  Returns the setting of entity
	 * @return {EntitySettings}
	 */
	getEntitySettings(): Settings {
		return this.entitySettings;
	}
	/**
	 * @desc  Returns the meta object of entity
	 * @return {Metadata}
	 */
	getEntityMeta(): Meta {
		return this.entityMeta;
	}
	/**
	 * @desc  Returns the xml string of entity metadata
	 * @return {string}
	 */
	getMetadata(): string {
		return this.entityMeta.getMetadata();
	}

	/**
	 * @desc  Exports the entity metadata into specified folder
	 * @param  {string} exportFile indicates the file name
	 */
	exportMetadata(exportFile: string) {
		return this.entityMeta.exportMetadata(exportFile);
	}

	/** * @desc  Verify fields with the one specified in metadata
	 * @param  {string/[string]} field is a string or an array of string indicating the field value in SAML message
	 * @param  {string} metaField is a string indicating the same field specified in metadata
	 * @return {boolean} True/False
	 */
	verifyFields(field: string | string[], metaField: string): boolean {
		if (isString(field)) {
			return field === metaField;
		}
		if (isNonEmptyArray(field)) {
			let res = true;
			field.forEach((f) => {
				if (f !== metaField) {
					res = false;
					return;
				}
			});
			return res;
		}
		return false;
	}
	/** @desc   Generates the logout request for developers to design their own method
	 * @param  {ServiceProvider} sp     object of service provider
	 * @param  {string}   binding       protocol binding
	 * @param  {object}   user          current logged user (e.g. user)
	 * @param  {string} relayState      the URL to which to redirect the user when logout is complete
	 * @param  {function} customTagReplacement     used when developers have their own login response template
	 */
	createLogoutRequest(
		target: Entity,
		protocol: BindingNamespace,
		user: Record<string, any>,
		relayState = '',
		customTagReplacement?: CustomTagReplacement
	): BindingContext | PostBindingContext {
		if (protocol === BindingNamespace.Redirect) {
			return redirectBinding.logoutRequestRedirectURL(user, { init: this, target }, relayState, customTagReplacement);
		}
		if (protocol === BindingNamespace.Post) {
			const entityEndpoint = target.entityMeta.getSingleLogoutService(protocol);
			const context = postBinding.base64LogoutRequest(
				user,
				"/*[local-name(.)='LogoutRequest']",
				{ init: this, target },
				customTagReplacement
			);
			return {
				...context,
				relayState,
				entityEndpoint,
				type: 'SAMLRequest',
			};
		}
		// Will support artifact in the next release
		throw new SamlifyError(SamlifyErrorCode.UnsupportedBinding);
	}

	/**
	 * @desc  Generates the logout response for developers to design their own method
	 * @param  {IdentityProvider} idp                 object of identity provider
	 * @param  {Partial<FlowResult>|null} requestInfo corresponding request, used to obtain the id
	 * @param  {string} relayState                    the URL to which to redirect the user when logout is complete.
	 * @param  {string} binding                       protocol binding
	 * @param  {function} customTagReplacement        used when developers have their own login response template
	 */
	createLogoutResponse(
		target: Entity,
		requestInfo: Partial<FlowResult<ParsedLogoutRequest>> | null,
		protocol: BindingNamespace,
		relayState = '',
		customTagReplacement?: CustomTagReplacement
	): BindingContext | PostBindingContext {
		if (protocol === BindingNamespace.Redirect) {
			return redirectBinding.logoutResponseRedirectURL(
				requestInfo,
				{
					init: this,
					target,
				},
				relayState,
				customTagReplacement
			);
		}
		if (protocol === BindingNamespace.Post) {
			const context = postBinding.base64LogoutResponse(requestInfo, { init: this, target }, customTagReplacement);
			return {
				...context,
				relayState,
				entityEndpoint: target.entityMeta.getSingleLogoutService(protocol),
				type: 'SAMLResponse',
			};
		}
		throw new SamlifyError(SamlifyErrorCode.UnsupportedBinding);
	}

	/**
	 * @desc   Validation of the parsed the URL parameters
	 * @param  {IdentityProvider} idp        object of identity provider
	 * @param  {BindingNamespace} protocol   protocol binding
	 * @param  {request}   req               request
	 * @return {Promise<FlowResult>}
	 */
	parseLogoutRequest(
		from: Entity,
		protocol: BindingNamespace,
		request: ESamlHttpRequest
	): Promise<FlowResult<ParsedLogoutRequest>> {
		return flow({
			from: from,
			self: this,
			type: 'logout',
			parserType: ParserType.LogoutRequest,
			checkSignature: this.entitySettings.wantLogoutRequestSigned,
			binding: protocol,
			request: request,
		}) as Promise<FlowResult<ParsedLogoutRequest>>;
	}
	/**
	 * @desc   Validation of the parsed the URL parameters
	 * @param  {object}           config     config for the parser
	 * @param  {BindingNamespace} protocol   protocol binding
	 * @param  {ESamlHttpRequest} req        request
	 * @return {Promise<FlowResult>}
	 */
	parseLogoutResponse(
		from: Entity,
		protocol: BindingNamespace,
		request: ESamlHttpRequest
	): Promise<FlowResult<ParsedLogoutResponse>> {
		return flow({
			from: from,
			self: this,
			type: 'logout',
			parserType: ParserType.LogoutResponse,
			checkSignature: this.entitySettings.wantLogoutResponseSigned,
			binding: protocol,
			request: request,
		}) as Promise<FlowResult<ParsedLogoutResponse>>;
	}
}
