import {createBrandActions} from './modules/platform-brand.mjs';
import {createSupportActions} from './modules/platform-support.mjs';
import {createRelayActions} from './modules/platform-relay.mjs';
import {createCompanyJoin} from './modules/company-join.mjs';
import {createFounderActivation} from './modules/founder-activation.mjs';
import {createOrderSms} from './modules/order-sms.mjs';
import {createStatementDelivery} from './modules/statement-delivery.mjs';
import {createPlatformActions} from './modules/platform-companies.mjs';
import './accounts-policy.js';
import './accounts-data-policy.js';
import './product-cost-core.js';
import {createHandler} from './core.mjs';
import {createRestDependencies} from './rest.mjs';
import {createGalleryActions} from './modules/gallery.mjs';
import {createChatActions,turnConfiguration} from './modules/chat.mjs';
import {createFilesActions} from './modules/files.mjs';
import {createFinanceActions} from './modules/finance.mjs';
import {createQuoteProvider} from './modules/quote-provider.mjs';
import {createOperationsActions} from './modules/operations.mjs';
import {createAssistantActions} from './modules/assistant.mjs';
import {createAssistantProvider} from './modules/assistant-provider.mjs';
import {createOfflineGrantActions} from './modules/offline-grant.mjs';
import {createStorageMaintenance} from './modules/maintenance.mjs';
import {createCustomerAuthActions,createCustomerAuthProvider} from './modules/customer-auth.mjs';
import {createPublicShareActions,createPublicShareAPI} from './modules/public-share.mjs';
import {createCommunications} from './modules/communications.mjs';
import {createMailProvider} from './modules/mail-provider.mjs';
import {createOwnerActivationActions} from './modules/owner-activation.mjs';

// These are Supabase's built-in server variables. They are never emitted in a
// response, logged, placed in app configuration, or copied to the repository.
const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const remote=createRestDependencies({url:Deno.env.get('SUPABASE_URL'),serviceKey:secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')});
const origins=(Deno.env.get('WOW_ALLOWED_ORIGINS')||'https://markrobot.wowfurniture.com.tr,https://galeri.wowfurniture.com.tr')
  .split(',').map(value=>value.trim()).filter(Boolean);
const globals=globalThis as unknown as Record<string,unknown>;
const policy=globals.WFAccountPolicy as {permissionKeys:string[]};
const assistantProvider=createAssistantProvider({
  apiKey:Deno.env.get('OPENAI_API_KEY'),model:Deno.env.get('WOW_AI_MODEL'),
  receiptKey:Deno.env.get('WOW_AI_RECEIPT_KEY')
});
const customerAuth=createCustomerAuthActions({
  provider:createCustomerAuthProvider({url:Deno.env.get('SUPABASE_URL'),serviceKey:secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}),
  auth:remote.auth,origins,requireCompanyApproval:true,enabled:Deno.env.get('WOW_CUSTOMER_AUTH_ENABLED')==='true'
});
const ownerActivation=createOwnerActivationActions({...remote,origins,productionOrigin:Deno.env.get('WOW_PUBLIC_APP_ORIGIN')||origins[0]});
const publicShareOptions={...remote,projectUrl:Deno.env.get('SUPABASE_URL'),publicOrigin:Deno.env.get('WOW_PUBLIC_APP_ORIGIN'),allowedOrigins:origins};
const publicShare=createPublicShareAPI(publicShareOptions);
const communications=createCommunications({moduleRpc:remote.moduleRpc,workerRpc:remote.communicationsRpc,
  provider:createMailProvider({apiKey:Deno.env.get('RESEND_API_KEY'),enabled:Deno.env.get('WOW_EMAIL_ENABLED')==='true',webhookSecret:Deno.env.get('RESEND_WEBHOOK_SECRET')})});
const statements=createStatementDelivery({...remote,config:{
  emailEnabled:Deno.env.get('WOW_STATEMENT_EMAIL_ENABLED')==='true',emailKey:Deno.env.get('RESEND_API_KEY'),
  emailFrom:Deno.env.get('WOW_STATEMENT_FROM_EMAIL'),emailWorkspace:Deno.env.get('WOW_STATEMENT_EMAIL_WORKSPACE'),
  waEnabled:Deno.env.get('WOW_STATEMENT_WHATSAPP_ENABLED')==='true',waToken:Deno.env.get('WOW_WHATSAPP_TOKEN'),
  waPhone:Deno.env.get('WOW_WHATSAPP_PHONE_ID'),waVersion:Deno.env.get('WOW_WHATSAPP_GRAPH_VERSION'),
  waTemplate:Deno.env.get('WOW_WHATSAPP_TEMPLATE'),waLocale:Deno.env.get('WOW_WHATSAPP_TEMPLATE_LANGUAGE'),
  waWorkspace:Deno.env.get('WOW_WHATSAPP_WORKSPACE')
}});
const companyJoin=createCompanyJoin({...remote,origins});
const founderActivation=createFounderActivation({...remote,origin:origins[0],enabled:Deno.env.get('WOW_OWNER_RECOVERY_EMAIL_ENABLED')==='true'});
const orderSms=createOrderSms({...remote,config:{enabled:Deno.env.get('WOW_NETGSM_ENABLED')==='true',tenants:Deno.env.get('WOW_NETGSM_TENANTS'),signingKey:Deno.env.get('WOW_ORDER_LINK_SIGNING_KEY'),projectUrl:Deno.env.get('SUPABASE_URL')}});
const storageMaintenance=createStorageMaintenance(remote);
const maintenance=async()=>{
  const results=await Promise.allSettled([storageMaintenance(),communications.process(),statements.process()]);
  if(results.some(result=>result.status==='rejected'))throw new Error('MAINTENANCE_DEFERRED');
};
const voiceTurn={url:Deno.env.get('WOW_TURN_URL'),urls:Deno.env.get('WOW_TURN_URLS'),secret:Deno.env.get('WOW_TURN_SHARED_SECRET'),
  cloudflareKeyId:Deno.env.get('WOW_CF_TURN_KEY_ID'),cloudflareToken:Deno.env.get('WOW_CF_TURN_API_TOKEN')};
const relay=turnConfiguration(voiceTurn);
const relayActions=createRelayActions({...remote,managed:relay.managed,accountId:Deno.env.get('WOW_CF_ACCOUNT_ID'),
  analyticsToken:Deno.env.get('WOW_CF_ANALYTICS_TOKEN')});
const moduleActions={...relayActions,...companyJoin.actions,...founderActivation.actions,...orderSms.actions,...statements.actions,...createPlatformActions(remote),...createSupportActions(remote),...createBrandActions(remote),...createGalleryActions(remote),...createChatActions({...remote,voiceTurn}),...createFilesActions(remote),
  ...customerAuth.actions,...ownerActivation.actions,...createPublicShareActions(publicShareOptions),...communications.actions,
  ...createFinanceActions({...remote,quoteProvider:createQuoteProvider({goldApiKey:Deno.env.get('GOLDAPI_KEY')})}),
  ...createOperationsActions({...remote,configuration:{aiConfigured:assistantProvider.configured===true}}),
  ...createAssistantActions({moduleRpc:remote.moduleRpc,provider:assistantProvider}),
  ...createOfflineGrantActions({rpc:remote.rpc,origins,permissionKeys:policy.permissionKeys,
    endpoint:(Deno.env.get('SUPABASE_URL')||'').replace(/\/$/,'')+'/functions/v1/wow-cloud',
    signingKey:Deno.env.get('WOW_OFFLINE_OWNER_SIGNING_JWK'),loadSigningKey:remote.offlineSigningKey})};
const app=createHandler({...remote,origins,moduleActions,publicActions:{...companyJoin.publicActions,...founderActivation.publicActions,...customerAuth.publicActions,...ownerActivation.publicActions},policy,dataPolicy:globals.WFAccountDataPolicy,costCore:globals.WFCostCore});
let worker: ((req:Request)=>Promise<Response>)|undefined;
Deno.serve(async(req:Request)=>{
  if(/^\/(?:functions\/v1\/)?wow-cloud\/order-download\//.test(new URL(req.url).pathname)||new URL(req.url).pathname.startsWith('/order-download/'))return orderSms.download(req);
  if(new URL(req.url).pathname.startsWith('/functions/v1/wow-cloud/public-share/'))return publicShare(req);
  if(new URL(req.url).pathname==='/functions/v1/wow-cloud/mail-webhook')return communications.webhook(req);
  if(new URL(req.url).pathname.endsWith('/health')){
    if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
    try{
      const state=await remote.health();
      if(state?.ok!==true)throw new Error('UNAVAILABLE');
      const turnConfigured=!!(relay.secret&&relay.urls.length)||(relay.managed&&await remote.relayEnabled().catch(()=>false)===true);
      return Response.json({ok:true,service:'mark-robot',checkedAt:state.checkedAt,turnConfigured,orderSmsConfigured:orderSms.configured,statementChannels:statements.configured},{headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
    }catch(_){return Response.json({ok:false,service:'mark-robot'},{status:503,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});}
  }
  if(new URL(req.url).pathname.endsWith('/push-worker')){
    if(!worker){
      const [{createPushWorker},{generateRequestDetails}]=await Promise.all([import('./push-worker.mjs'),import('npm:web-push@4.0.0')]);
      worker=createPushWorker({rpc:remote.pushRpc,generateRequestDetails,maintenance});
    }
    return worker(req);
  }
  return app(req);
});
