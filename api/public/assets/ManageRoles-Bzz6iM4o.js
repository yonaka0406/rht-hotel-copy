import{B as H,s as N,o as u,c as L,m as g,X as z,Z as x,p as D,Q as q,Y as F,$ as J,a0 as Y,S as Z,V as G,W as Q,b as f,x as W,A as E,w as h,a,T as ee,z as ne,r as O,F as U,C as V,n as te,e as _,d as p,t as K,a1 as I,_ as oe,u as ie,h as re,I as T,J as se,y as ae,g as ce}from"./index-D1uxBxpa.js";import{s as M}from"./index-CZva3LPW.js";import{s as le}from"./index-QDYjf4BC.js";import{a as pe,b as ue,s as de}from"./index-BIeAlUJT.js";import{s as me}from"./index-7jlECg0w.js";import{s as fe}from"./index-B_dfm8Z3.js";import{s as he}from"./index-Cf12HKFp.js";import{s as be}from"./index-CBYPfZAM.js";import{s as ge}from"./index-4M-XO5NK.js";import{F as ve}from"./index-SJxkweTD.js";import{O as ye}from"./index-UcX-Yj_6.js";import"./index-DU-Aobhb.js";import"./index-OFUA_Emm.js";import"./index-BRLBpJjm.js";var ke=function(e){var t=e.dt;return`
.p-skeleton {
    overflow: hidden;
    background: `.concat(t("skeleton.background"),`;
    border-radius: `).concat(t("skeleton.border.radius"),`;
}

.p-skeleton::after {
    content: "";
    animation: p-skeleton-animation 1.2s infinite;
    height: 100%;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    transform: translateX(-100%);
    z-index: 1;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0), `).concat(t("skeleton.animation.background"),`, rgba(255, 255, 255, 0));
}

[dir='rtl'] .p-skeleton::after {
    animation-name: p-skeleton-animation-rtl;
}

.p-skeleton-circle {
    border-radius: 50%;
}

.p-skeleton-animation-none::after {
    animation: none;
}

@keyframes p-skeleton-animation {
    from {
        transform: translateX(-100%);
    }
    to {
        transform: translateX(100%);
    }
}

@keyframes p-skeleton-animation-rtl {
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(-100%);
    }
}
`)},we={root:{position:"relative"}},Le={root:function(e){var t=e.props;return["p-skeleton p-component",{"p-skeleton-circle":t.shape==="circle","p-skeleton-animation-none":t.animation==="none"}]}},Ce=H.extend({name:"skeleton",theme:ke,classes:Le,inlineStyles:we}),Re={name:"BaseSkeleton",extends:N,props:{shape:{type:String,default:"rectangle"},size:{type:String,default:null},width:{type:String,default:"100%"},height:{type:String,default:"1rem"},borderRadius:{type:String,default:null},animation:{type:String,default:"wave"}},style:Ce,provide:function(){return{$pcSkeleton:this,$parentInstance:this}}},$={name:"Skeleton",extends:Re,inheritAttrs:!1,computed:{containerStyle:function(){return this.size?{width:this.size,height:this.size,borderRadius:this.borderRadius}:{width:this.width,height:this.height,borderRadius:this.borderRadius}}}};function je(n,e,t,r,l,i){return u(),L("div",g({class:n.cx("root"),style:[n.sx("root"),i.containerStyle],"aria-hidden":"true"},n.ptmi("root")),null,16)}$.render=je;var Se=function(e){var t=e.dt;return`
.p-confirmpopup {
    position: absolute;
    margin-top: `.concat(t("confirmpopup.gutter"),`;
    top: 0;
    left: 0;
    background: `).concat(t("confirmpopup.background"),`;
    color: `).concat(t("confirmpopup.color"),`;
    border: 1px solid `).concat(t("confirmpopup.border.color"),`;
    border-radius: `).concat(t("confirmpopup.border.radius"),`;
    box-shadow: `).concat(t("confirmpopup.shadow"),`;
}

.p-confirmpopup-content {
    display: flex;
    align-items: center;
    padding: `).concat(t("confirmpopup.content.padding"),`;
    gap: `).concat(t("confirmpopup.content.gap"),`;
}

.p-confirmpopup-icon {
    font-size: `).concat(t("confirmpopup.icon.size"),`;
    width: `).concat(t("confirmpopup.icon.size"),`;
    height: `).concat(t("confirmpopup.icon.size"),`;
    color: `).concat(t("confirmpopup.icon.color"),`;
}

.p-confirmpopup-footer {
    display: flex;
    justify-content: flex-end;
    gap: `).concat(t("confirmpopup.footer.gap"),`;
    padding: `).concat(t("confirmpopup.footer.padding"),`;
}

.p-confirmpopup-footer button {
    width: auto;
}

.p-confirmpopup-footer button:last-child {
    margin: 0;
}

.p-confirmpopup-flipped {
    margin-block-start: calc(`).concat(t("confirmpopup.gutter"),` * -1);
    margin-block-end: `).concat(t("confirmpopup.gutter"),`;
}

.p-confirmpopup-enter-from {
    opacity: 0;
    transform: scaleY(0.8);
}

.p-confirmpopup-leave-to {
    opacity: 0;
}

.p-confirmpopup-enter-active {
    transition: transform 0.12s cubic-bezier(0, 0, 0.2, 1), opacity 0.12s cubic-bezier(0, 0, 0.2, 1);
}

.p-confirmpopup-leave-active {
    transition: opacity 0.1s linear;
}

.p-confirmpopup:after,
.p-confirmpopup:before {
    bottom: 100%;
    left: calc(`).concat(t("confirmpopup.arrow.offset")," + ").concat(t("confirmpopup.arrow.left"),`);
    content: " ";
    height: 0;
    width: 0;
    position: absolute;
    pointer-events: none;
}

.p-confirmpopup:after {
    border-width: calc(`).concat(t("confirmpopup.gutter"),` - 2px);
    margin-left: calc(-1 * (`).concat(t("confirmpopup.gutter"),` - 2px));
    border-style: solid;
    border-color: transparent;
    border-bottom-color: `).concat(t("confirmpopup.background"),`;
}

.p-confirmpopup:before {
    border-width: `).concat(t("confirmpopup.gutter"),`;
    margin-left: calc(-1 * `).concat(t("confirmpopup.gutter"),`);
    border-style: solid;
    border-color: transparent;
    border-bottom-color: `).concat(t("confirmpopup.border.color"),`;
}

.p-confirmpopup-flipped:after,
.p-confirmpopup-flipped:before {
    bottom: auto;
    top: 100%;
}

.p-confirmpopup-flipped:after {
    border-bottom-color: transparent;
    border-top-color: `).concat(t("confirmpopup.background"),`;
}

.p-confirmpopup-flipped:before {
    border-bottom-color: transparent;
    border-top-color: `).concat(t("confirmpopup.border.color"),`;
}
`)},Te={root:"p-confirmpopup p-component",content:"p-confirmpopup-content",icon:"p-confirmpopup-icon",message:"p-confirmpopup-message",footer:"p-confirmpopup-footer",pcRejectButton:"p-confirmpopup-reject-button",pcAcceptButton:"p-confirmpopup-accept-button"},ze=H.extend({name:"confirmpopup",theme:Se,classes:Te}),Ee={name:"BaseConfirmPopup",extends:N,props:{group:String},style:ze,provide:function(){return{$pcConfirmPopup:this,$parentInstance:this}}},X={name:"ConfirmPopup",extends:Ee,inheritAttrs:!1,data:function(){return{visible:!1,confirmation:null,autoFocusAccept:null,autoFocusReject:null,target:null}},target:null,outsideClickListener:null,scrollHandler:null,resizeListener:null,container:null,confirmListener:null,closeListener:null,mounted:function(){var e=this;this.confirmListener=function(t){t&&t.group===e.group&&(e.confirmation=t,e.target=t.target,e.confirmation.onShow&&e.confirmation.onShow(),e.visible=!0)},this.closeListener=function(){e.visible=!1,e.confirmation=null},z.on("confirm",this.confirmListener),z.on("close",this.closeListener)},beforeUnmount:function(){z.off("confirm",this.confirmListener),z.off("close",this.closeListener),this.unbindOutsideClickListener(),this.scrollHandler&&(this.scrollHandler.destroy(),this.scrollHandler=null),this.unbindResizeListener(),this.container&&(x.clear(this.container),this.container=null),this.target=null,this.confirmation=null},methods:{accept:function(){this.confirmation.accept&&this.confirmation.accept(),this.visible=!1},reject:function(){this.confirmation.reject&&this.confirmation.reject(),this.visible=!1},onHide:function(){this.confirmation.onHide&&this.confirmation.onHide(),this.visible=!1},onAcceptKeydown:function(e){(e.code==="Space"||e.code==="Enter"||e.code==="NumpadEnter")&&(this.accept(),D(this.target),e.preventDefault())},onRejectKeydown:function(e){(e.code==="Space"||e.code==="Enter"||e.code==="NumpadEnter")&&(this.reject(),D(this.target),e.preventDefault())},onEnter:function(e){this.autoFocusAccept=this.confirmation.defaultFocus===void 0||this.confirmation.defaultFocus==="accept",this.autoFocusReject=this.confirmation.defaultFocus==="reject",this.target=this.target||document.activeElement,this.bindOutsideClickListener(),this.bindScrollListener(),this.bindResizeListener(),x.set("overlay",e,this.$primevue.config.zIndex.overlay)},onAfterEnter:function(){this.focus()},onLeave:function(){this.autoFocusAccept=null,this.autoFocusReject=null,D(this.target),this.target=null,this.unbindOutsideClickListener(),this.unbindScrollListener(),this.unbindResizeListener()},onAfterLeave:function(e){x.clear(e)},alignOverlay:function(){q(this.container,this.target,!1);var e=F(this.container),t=F(this.target),r=0;e.left<t.left&&(r=t.left-e.left),this.container.style.setProperty(J("confirmpopup.arrow.left").name,"".concat(r,"px")),e.top<t.top&&(this.container.setAttribute("data-p-confirmpopup-flipped","true"),!this.isUnstyled&&Y(this.container,"p-confirmpopup-flipped"))},bindOutsideClickListener:function(){var e=this;this.outsideClickListener||(this.outsideClickListener=function(t){e.visible&&e.container&&!e.container.contains(t.target)&&!e.isTargetClicked(t)?(e.confirmation.onHide&&e.confirmation.onHide(),e.visible=!1):e.alignOverlay()},document.addEventListener("click",this.outsideClickListener))},unbindOutsideClickListener:function(){this.outsideClickListener&&(document.removeEventListener("click",this.outsideClickListener),this.outsideClickListener=null)},bindScrollListener:function(){var e=this;this.scrollHandler||(this.scrollHandler=new Z(this.target,function(){e.visible&&(e.visible=!1)})),this.scrollHandler.bindScrollListener()},unbindScrollListener:function(){this.scrollHandler&&this.scrollHandler.unbindScrollListener()},bindResizeListener:function(){var e=this;this.resizeListener||(this.resizeListener=function(){e.visible&&!G()&&(e.visible=!1)},window.addEventListener("resize",this.resizeListener))},unbindResizeListener:function(){this.resizeListener&&(window.removeEventListener("resize",this.resizeListener),this.resizeListener=null)},focus:function(){var e=this.container.querySelector("[autofocus]");e&&e.focus({preventScroll:!0})},isTargetClicked:function(e){return this.target&&(this.target===e.target||this.target.contains(e.target))},containerRef:function(e){this.container=e},onOverlayClick:function(e){ye.emit("overlay-click",{originalEvent:e,target:this.target})},onOverlayKeydown:function(e){e.code==="Escape"&&(z.emit("close",this.closeListener),D(this.target))}},computed:{message:function(){return this.confirmation?this.confirmation.message:null},acceptLabel:function(){if(this.confirmation){var e,t=this.confirmation;return t.acceptLabel||((e=t.acceptProps)===null||e===void 0?void 0:e.label)||this.$primevue.config.locale.accept}return this.$primevue.config.locale.accept},rejectLabel:function(){if(this.confirmation){var e,t=this.confirmation;return t.rejectLabel||((e=t.rejectProps)===null||e===void 0?void 0:e.label)||this.$primevue.config.locale.reject}return this.$primevue.config.locale.reject},acceptIcon:function(){var e;return this.confirmation?this.confirmation.acceptIcon:(e=this.confirmation)!==null&&e!==void 0&&e.acceptProps?this.confirmation.acceptProps.icon:null},rejectIcon:function(){var e;return this.confirmation?this.confirmation.rejectIcon:(e=this.confirmation)!==null&&e!==void 0&&e.rejectProps?this.confirmation.rejectProps.icon:null}},components:{Button:M,Portal:Q},directives:{focustrap:ve}},Ae=["aria-modal"];function De(n,e,t,r,l,i){var b=f("Button"),v=f("Portal"),C=W("focustrap");return u(),E(v,null,{default:h(function(){return[a(ee,g({name:"p-confirmpopup",onEnter:i.onEnter,onAfterEnter:i.onAfterEnter,onLeave:i.onLeave,onAfterLeave:i.onAfterLeave},n.ptm("transition")),{default:h(function(){var k,R,j;return[l.visible?ne((u(),L("div",g({key:0,ref:i.containerRef,role:"alertdialog",class:n.cx("root"),"aria-modal":l.visible,onClick:e[2]||(e[2]=function(){return i.onOverlayClick&&i.onOverlayClick.apply(i,arguments)}),onKeydown:e[3]||(e[3]=function(){return i.onOverlayKeydown&&i.onOverlayKeydown.apply(i,arguments)})},n.ptmi("root")),[n.$slots.container?O(n.$slots,"container",{key:0,message:l.confirmation,acceptCallback:i.accept,rejectCallback:i.reject}):(u(),L(U,{key:1},[n.$slots.message?(u(),E(V(n.$slots.message),{key:1,message:l.confirmation},null,8,["message"])):(u(),L("div",g({key:0,class:n.cx("content")},n.ptm("content")),[O(n.$slots,"icon",{},function(){return[n.$slots.icon?(u(),E(V(n.$slots.icon),{key:0,class:te(n.cx("icon"))},null,8,["class"])):l.confirmation.icon?(u(),L("span",g({key:1,class:[l.confirmation.icon,n.cx("icon")]},n.ptm("icon")),null,16)):_("",!0)]}),p("span",g({class:n.cx("message")},n.ptm("message")),K(l.confirmation.message),17)],16)),p("div",g({class:n.cx("footer")},n.ptm("footer")),[a(b,g({class:[n.cx("pcRejectButton"),l.confirmation.rejectClass],autofocus:l.autoFocusReject,unstyled:n.unstyled,size:((k=l.confirmation.rejectProps)===null||k===void 0?void 0:k.size)||"small",text:((R=l.confirmation.rejectProps)===null||R===void 0?void 0:R.text)||!1,onClick:e[0]||(e[0]=function(d){return i.reject()}),onKeydown:i.onRejectKeydown},l.confirmation.rejectProps,{label:i.rejectLabel,pt:n.ptm("pcRejectButton")}),I({_:2},[i.rejectIcon||n.$slots.rejecticon?{name:"icon",fn:h(function(d){return[O(n.$slots,"rejecticon",{},function(){return[p("span",g({class:[i.rejectIcon,d.class]},n.ptm("pcRejectButton").icon,{"data-pc-section":"rejectbuttonicon"}),null,16)]})]}),key:"0"}:void 0]),1040,["class","autofocus","unstyled","size","text","onKeydown","label","pt"]),a(b,g({class:[n.cx("pcAcceptButton"),l.confirmation.acceptClass],autofocus:l.autoFocusAccept,unstyled:n.unstyled,size:((j=l.confirmation.acceptProps)===null||j===void 0?void 0:j.size)||"small",onClick:e[1]||(e[1]=function(d){return i.accept()}),onKeydown:i.onAcceptKeydown},l.confirmation.acceptProps,{label:i.acceptLabel,pt:n.ptm("pcAcceptButton")}),I({_:2},[i.acceptIcon||n.$slots.accepticon?{name:"icon",fn:h(function(d){return[O(n.$slots,"accepticon",{},function(){return[p("span",g({class:[i.acceptIcon,d.class]},n.ptm("pcAcceptButton").icon,{"data-pc-section":"acceptbuttonicon"}),null,16)]})]}),key:"0"}:void 0]),1040,["class","autofocus","unstyled","size","onKeydown","label","pt"])],16)],64))],16,Ae)),[[C]]):_("",!0)]}),_:3},16,["onEnter","onAfterEnter","onLeave","onAfterLeave"])]}),_:3})}X.render=De;const Oe={name:"ManageRoles",components:{Button:M,Card:le,Skeleton:$,DataTable:pe,Column:ue,Dialog:de,FloatLabel:me,InputText:fe,Textarea:he,MultiSelect:be,Panel:ge,ConfirmPopup:X},setup(){const n=ie(),e=re(),t=c=>new Promise(o=>setTimeout(o,c)),r=T(!0),l=T([]),i=T(!1),b=T({name:"",permissions:[]}),v=T(""),C=T([{name:"Manage Database",code:"manage_db"},{name:"Manage Users",code:"manage_users"},{name:"Manage Clients",code:"manage_clients"},{name:"View Reports",code:"view_reports"}]),k=async()=>{let c=!1;for(;!c;){const o=localStorage.getItem("authToken");try{const s=await fetch("/api/roles",{method:"GET",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"}});if(s.ok){const w=await s.json();l.value=w.map(m=>({...m,permissions:Object.keys(m.permissions).filter(y=>m.permissions[y]).map(y=>C.value.find(P=>P.code===y))})),c=!0}else console.error("Failed to fetch roles:",s.statusText)}catch(s){console.error("Error fetching roles:",s)}c||(console.log("Retrying in 2 seconds..."),await t(2e3))}r.value=!1},R=async c=>{const o=localStorage.getItem("authToken");try{const s=c.permissions.reduce((y,P)=>(y[P.code]=!0,y),{}),w={id:c.id,role_name:c.role_name,permissions:s,description:c.description},m=await fetch("/api/roles/update",{method:"PUT",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},body:JSON.stringify(w)});if(m.ok){const y=await m.json();console.log("Role updated successfully:",y),n.add({severity:"success",summary:"Role Updated",detail:"Permissions have been updated successfully.",life:3e3})}else console.error("Failed to update role:",m.statusText),n.add({severity:"error",summary:"Update Failed",detail:m.statusText,life:5e3})}catch(s){console.error("Error updating permissions:",s),n.add({severity:"error",summary:"Error",detail:"An unexpected error occurred while updating the role.",life:5e3})}},j=()=>{i.value=!0},d=async()=>{const c=localStorage.getItem("authToken");try{const o=b.value.permissions.reduce((m,y)=>(m[y.code]=!0,m),{}),s={role_name:b.value.name,permissions:o,description:b.value.description},w=await fetch("/api/roles/create",{method:"POST",headers:{Authorization:`Bearer ${c}`,"Content-Type":"application/json"},body:JSON.stringify(s)});if(w.ok)cancelDialog(),k();else if(w.status===409){const m=await w.json();v.value=m.error}else throw new Error("Failed to create role")}catch(o){console.error("Error creating role:",o)}},A=c=>Object.keys(c.permissions).filter(o=>c.permissions[o]).join(", "),S=async c=>{const o=localStorage.getItem("authToken");try{const s=await fetch(`/api/roles/delete/${c.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"}});if(s.ok){const w=await s.json();console.log("Role deleted successfully:",w)}else s.status===403?(console.error("Failed to delete role:",s.statusText),n.add({severity:"error",summary:"Delete Denied",detail:s.statusText,life:3e3})):(console.error("Failed to delete role:",s.statusText),n.add({severity:"error",summary:"Delete Failed",detail:"Unable to delete the role. Please try again.",life:3e3}))}catch(s){console.error("Error deleting role:",s),n.add({severity:"error",summary:"Error",detail:"An unexpected error occurred while deleting the role.",life:3e3})}},B=c=>{e.require({message:`Are you sure you want to delete the role "${c.role_name}"?`,header:"Delete Confirmation",icon:"pi pi-info-circle",acceptClass:"p-button-danger",accept:()=>{S(c),n.add({severity:"success",summary:"Role Deleted",detail:`Role "${c.role_name}" will be deleted.`,life:3e3})},reject:()=>{n.add({severity:"info",summary:"Delete Cancelled",detail:"Role deletion was cancelled.",life:3e3})}})};return se(()=>{k()}),{isLoading:r,roles:l,createRoleDialog:i,newRole:b,dialogErrorMessage:v,permissionsList:C,fetchRoles:k,submitPermissionsChange:R,createRole:j,submitNewRole:d,permissionsTemplate:A,deleteRole:S,confirmDelete:B}},methods:{cancelDialog(){this.newRole={name:"",permissions:[],description:""},this.createRoleDialog=!1}}},_e={class:"p-4"},Be={class:"text-left"},Pe={key:1,class:"p-datatable p-datatable-sm w-full"},xe={class:"field mb-5 mt-5"},Fe={class:"field mb-5 mt-5"},Ve={class:"field mb-3 mt-5"},Ie={key:0,class:"p-error mt-2 text-red-500 text-sm text-center"},He={class:"mb-3 mt-5 text-center"};function Ne(n,e,t,r,l,i){const b=f("Button"),v=f("Column"),C=f("MultiSelect"),k=f("Textarea"),R=f("ConfirmPopup"),j=f("DataTable"),d=f("Skeleton"),A=f("InputText"),S=f("FloatLabel"),B=f("Dialog"),c=f("Panel");return u(),L("div",_e,[a(c,{header:"Manage Roles"},{default:h(()=>[p("div",null,[p("div",Be,[a(b,{label:"Create Role",icon:"pi pi-plus",class:"p-button-success mb-4",onClick:r.createRole},null,8,["onClick"])]),p("div",null,[r.isLoading?(u(),L("div",Pe,[(u(),L(U,null,ae(10,o=>p("div",{key:o,class:"flex items-center p-2 border-b border-gray-200"},[a(d,{width:"5%",height:"2rem",class:"mr-2"}),a(d,{width:"25%",height:"2rem",class:"mr-2"}),a(d,{width:"30%",height:"2rem",class:"mr-2"}),a(d,{width:"30%",height:"2rem",class:"mr-2"}),a(d,{width:"10%",height:"2rem"})])),64))])):(u(),E(j,{key:0,value:r.roles,paginator:"",rows:10,class:"p-datatable-sm",scrollable:"",responsive:""},{default:h(()=>[a(v,{field:"id",header:"ID"}),a(v,{field:"role_name",header:"Role Name"}),a(v,{header:"Permissions"},{body:h(o=>[a(C,{modelValue:o.data.permissions,"onUpdate:modelValue":s=>o.data.permissions=s,options:r.permissionsList,optionLabel:"name",placeholder:"Select Permissions",class:"w-full md:w-80",disabled:o.data.id===1||o.data.id===5,onChange:s=>r.submitPermissionsChange(o.data)},null,8,["modelValue","onUpdate:modelValue","options","disabled","onChange"])]),_:1}),a(v,{header:"Description"},{body:h(o=>[a(k,{modelValue:o.data.description,"onUpdate:modelValue":s=>o.data.description=s,rows:"4",cols:"30",placeholder:"Enter description",class:"w-full",onChange:s=>r.submitPermissionsChange(o.data)},null,8,["modelValue","onUpdate:modelValue","onChange"])]),_:1}),a(v,{header:"Actions"},{body:h(o=>[o.data.id!==1&&o.data.id!==5?(u(),E(b,{key:0,icon:"pi pi-trash",class:"p-button-danger p-button-sm",onClick:s=>r.confirmDelete(o.data)},null,8,["onClick"])):_("",!0),a(R)]),_:1})]),_:1},8,["value"]))]),a(B,{modelValue:r.createRoleDialog,"onUpdate:modelValue":e[4]||(e[4]=o=>r.createRoleDialog=o),header:"Create New Role",visible:r.createRoleDialog,style:{width:"450px"},modal:"",closable:!1},{default:h(()=>[p("form",{onSubmit:e[3]||(e[3]=ce((...o)=>r.submitNewRole&&r.submitNewRole(...o),["prevent"]))},[p("div",xe,[a(S,null,{default:h(()=>[a(A,{id:"roleName",modelValue:r.newRole.name,"onUpdate:modelValue":e[0]||(e[0]=o=>r.newRole.name=o),class:"w-full",required:""},null,8,["modelValue"]),e[5]||(e[5]=p("label",{for:"roleName"},"Role Name",-1))]),_:1})]),p("div",Fe,[a(S,null,{default:h(()=>[a(C,{id:"permissions",modelValue:r.newRole.permissions,"onUpdate:modelValue":e[1]||(e[1]=o=>r.newRole.permissions=o),options:r.permissionsList,optionLabel:"name",display:"chip",class:"w-full"},null,8,["modelValue","options"]),e[6]||(e[6]=p("label",{for:"roleName"},"Permissions",-1))]),_:1})]),p("div",Ve,[a(S,null,{default:h(()=>[a(A,{id:"description",modelValue:r.newRole.description,"onUpdate:modelValue":e[2]||(e[2]=o=>r.newRole.description=o),class:"w-full"},null,8,["modelValue"]),e[7]||(e[7]=p("label",{for:"description"},"Description",-1))]),_:1})]),r.dialogErrorMessage?(u(),L("div",Ie,K(r.dialogErrorMessage),1)):_("",!0),p("div",He,[a(b,{type:"submit",label:"Create Role",class:"p-button-success",icon:"pi pi-check",severity:"success"}),a(b,{type:"button",label:"Cancel",class:"p-button-text p-button-secondary",icon:"pi pi-times",severity:"danger",onClick:i.cancelDialog},null,8,["onClick"])])],32)]),_:1},8,["modelValue","visible"])])]),_:1})])}const tn=oe(Oe,[["render",Ne]]);export{tn as default};
//# sourceMappingURL=ManageRoles-Bzz6iM4o.js.map
