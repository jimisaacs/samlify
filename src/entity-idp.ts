/**
 * @file entity-idp.ts
 * @author tngan
 * @desc  Declares the actions taken by identity provider
 */
import postBinding from './binding-post';
import { Entity, ESamlHttpRequest } from './entity';
import type { ServiceProvider } from './entity-sp';
import { SamlifyError, SamlifyErrorCode } from './error';
import { flow } from './flow';
import type { CustomTagReplacement } from './libsaml';
import metadataIdp, { MetadataIdp } from './metadata-idp';
import type { IdentityProviderSettings } from './types';
import { BindingNamespace, ParserType } from './urn';

/**
 * Identity prvider can be configured using either metadata importing or idpSetting
 */
export default function (props: IdentityProviderSettings) {
	return new IdentityProvider(props);
}

/**
 * Identity prvider can be configured using either metadata importing or idpSettings
 */
export class IdentityProvider extends Entity<IdentityProviderSettings, MetadataIdp> {
	constructor(idpSettings: IdentityProviderSettings) {
		const entitySettings = Object.assign(
			{
				wantAuthnRequestsSigned: false,
				tagPrefix: {
					encryptedAssertion: 'saml',
				},
			},
			idpSettings
		);
		const entityMeta = metadataIdp(entitySettings.metadata || entitySettings);
		// setting with metadata has higher precedence
		entitySettings.wantAuthnRequestsSigned = entityMeta.isWantAuthnRequestsSigned();
		super(entitySettings, entityMeta);
	}

	/**
	 * @desc  Generates the login response for developers to design their own method
	 * @param  sp                        object of service provider
	 * @param  requestInfo               corresponding request, used to obtain the id
	 * @param  binding                   protocol binding
	 * @param  user                      current logged user (e.g. req.user)
	 * @param  customTagReplacement      used when developers have their own login response template
	 * @param  encryptThenSign           whether or not to encrypt then sign first (if signing)
	 */
	public async createLoginResponse(
		sp: ServiceProvider,
		requestInfo: Record<string, unknown>,
		protocol: BindingNamespace,
		user: { [key: string]: any },
		customTagReplacement?: CustomTagReplacement,
		encryptThenSign?: boolean
	) {
		// can only support post binding for login response
		if (protocol === BindingNamespace.Post) {
			const context = await postBinding.base64LoginResponse(
				requestInfo,
				{
					idp: this,
					sp,
				},
				user,
				customTagReplacement,
				encryptThenSign
			);
			return {
				...context,
				entityEndpoint: sp.getEntityMeta().getAssertionConsumerService(protocol),
				type: 'SAMLResponse',
			};
		}
		throw new SamlifyError(SamlifyErrorCode.UnsupportedBinding);
	}

	/**
	 * Validation of the parsed URL parameters
	 * @param sp ServiceProvider instance
	 * @param binding Protocol binding
	 * @param req RequesmessageSigningOrderst
	 */
	parseLoginRequest(sp: ServiceProvider, binding: BindingNamespace, req: ESamlHttpRequest) {
		return flow({
			from: sp,
			self: this,
			checkSignature: this.entityMeta.isWantAuthnRequestsSigned(),
			parserType: ParserType.SAMLRequest,
			type: 'login',
			binding: binding,
			request: req,
		});
	}
}
