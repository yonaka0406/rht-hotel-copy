import{B as R,Z as P,a0 as me,p as T,ab as be,ac as ve,W as Q,ad as ge,b as m,x as F,o,A as S,w as v,c as l,m as c,a as g,T as ee,z as _,r as k,F as L,d as a,n as I,t as x,e as y,C as $,s as O,j as ye,R as we,U as W,a3 as A,v as X,N as ke,Q as Le,P as z,S as Se,V as xe,y as M,f as E,ae as ze,af as Ie,ag as B,ah as Ce,ai as Y,aj as Pe,_ as G,i as te,I as K,J as N,a6 as ne}from"./index-D1uxBxpa.js";import{u as ie,a as re}from"./useHotelStore-CcnjKFIZ.js";import{s as se}from"./index-OGjolN7Q.js";import{F as Ee,s as oe}from"./index-SJxkweTD.js";import{s as ae}from"./index-CZva3LPW.js";import{s as le}from"./index-C80g0QIn.js";import{O as Oe}from"./index-UcX-Yj_6.js";import{s as Te}from"./index-CimIeTGn.js";import"./index-DU-Aobhb.js";import"./index-B_dfm8Z3.js";var Me=function(e){var n=e.dt;return`
.p-drawer {
    display: flex;
    flex-direction: column;
    transform: translate3d(0px, 0px, 0px);
    position: relative;
    transition: transform 0.3s;
    background: `.concat(n("drawer.background"),`;
    color: `).concat(n("drawer.color"),`;
    border: 1px solid `).concat(n("drawer.border.color"),`;
    box-shadow: `).concat(n("drawer.shadow"),`;
}

.p-drawer-content {
    overflow-y: auto;
    flex-grow: 1;
    padding: `).concat(n("drawer.content.padding"),`;
}

.p-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    padding: `).concat(n("drawer.header.padding"),`;
}

.p-drawer-footer {
    padding: `).concat(n("drawer.footer.padding"),`;
}

.p-drawer-title {
    font-weight: `).concat(n("drawer.title.font.weight"),`;
    font-size: `).concat(n("drawer.title.font.size"),`;
}

.p-drawer-full .p-drawer {
    transition: none;
    transform: none;
    width: 100vw !important;
    height: 100vh !important;
    max-height: 100%;
    top: 0px !important;
    left: 0px !important;
    border-width: 1px;
}

.p-drawer-left .p-drawer-enter-from,
.p-drawer-left .p-drawer-leave-to {
    transform: translateX(-100%);
}

.p-drawer-right .p-drawer-enter-from,
.p-drawer-right .p-drawer-leave-to {
    transform: translateX(100%);
}

.p-drawer-top .p-drawer-enter-from,
.p-drawer-top .p-drawer-leave-to {
    transform: translateY(-100%);
}

.p-drawer-bottom .p-drawer-enter-from,
.p-drawer-bottom .p-drawer-leave-to {
    transform: translateY(100%);
}

.p-drawer-full .p-drawer-enter-from,
.p-drawer-full .p-drawer-leave-to {
    opacity: 0;
}

.p-drawer-full .p-drawer-enter-active,
.p-drawer-full .p-drawer-leave-active {
    transition: opacity 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

.p-drawer-left .p-drawer {
    width: 20rem;
    height: 100%;
    border-inline-end-width: 1px;
}

.p-drawer-right .p-drawer {
    width: 20rem;
    height: 100%;
    border-inline-start-width: 1px;
}

.p-drawer-top .p-drawer {
    height: 10rem;
    width: 100%;
    border-block-end-width: 1px;
}

.p-drawer-bottom .p-drawer {
    height: 10rem;
    width: 100%;
    border-block-start-width: 1px;
}

.p-drawer-left .p-drawer-content,
.p-drawer-right .p-drawer-content,
.p-drawer-top .p-drawer-content,
.p-drawer-bottom .p-drawer-content {
    width: 100%;
    height: 100%;
}

.p-drawer-open {
    display: flex;
}

.p-drawer-mask:dir(rtl) {
    flex-direction: row-reverse;
}
`)},Re={mask:function(e){var n=e.position,r=e.modal;return{position:"fixed",height:"100%",width:"100%",left:0,top:0,display:"flex",justifyContent:n==="left"?"flex-start":n==="right"?"flex-end":"center",alignItems:n==="top"?"flex-start":n==="bottom"?"flex-end":"center",pointerEvents:r?"auto":"none"}},root:{pointerEvents:"auto"}},De={mask:function(e){var n=e.instance,r=e.props,s=["left","right","top","bottom"],i=s.find(function(u){return u===r.position});return["p-drawer-mask",{"p-overlay-mask p-overlay-mask-enter":r.modal,"p-drawer-open":n.containerVisible,"p-drawer-full":n.fullScreen},i?"p-drawer-".concat(i):""]},root:function(e){var n=e.instance;return["p-drawer p-component",{"p-drawer-full":n.fullScreen}]},header:"p-drawer-header",title:"p-drawer-title",pcCloseButton:"p-drawer-close-button",content:"p-drawer-content",footer:"p-drawer-footer"},Ae=R.extend({name:"drawer",theme:Me,classes:De,inlineStyles:Re}),Be={name:"BaseDrawer",extends:O,props:{visible:{type:Boolean,default:!1},position:{type:String,default:"left"},header:{type:null,default:null},baseZIndex:{type:Number,default:0},autoZIndex:{type:Boolean,default:!0},dismissable:{type:Boolean,default:!0},showCloseIcon:{type:Boolean,default:!0},closeButtonProps:{type:Object,default:function(){return{severity:"secondary",text:!0,rounded:!0}}},closeIcon:{type:String,default:void 0},modal:{type:Boolean,default:!0},blockScroll:{type:Boolean,default:!1}},style:Ae,provide:function(){return{$pcDrawer:this,$parentInstance:this}}},Z={name:"Drawer",extends:Be,inheritAttrs:!1,emits:["update:visible","show","after-show","hide","after-hide"],data:function(){return{containerVisible:this.visible}},container:null,mask:null,content:null,headerContainer:null,footerContainer:null,closeButton:null,outsideClickListener:null,documentKeydownListener:null,watch:{dismissable:function(e){e?this.enableDocumentSettings():this.disableDocumentSettings()}},updated:function(){this.visible&&(this.containerVisible=this.visible)},beforeUnmount:function(){this.disableDocumentSettings(),this.mask&&this.autoZIndex&&P.clear(this.mask),this.container=null,this.mask=null},methods:{hide:function(){this.$emit("update:visible",!1)},onEnter:function(){this.$emit("show"),this.focus(),this.bindDocumentKeyDownListener(),this.autoZIndex&&P.set("modal",this.mask,this.baseZIndex||this.$primevue.config.zIndex.modal)},onAfterEnter:function(){this.enableDocumentSettings(),this.$emit("after-show")},onBeforeLeave:function(){this.modal&&!this.isUnstyled&&me(this.mask,"p-overlay-mask-leave")},onLeave:function(){this.$emit("hide")},onAfterLeave:function(){this.autoZIndex&&P.clear(this.mask),this.unbindDocumentKeyDownListener(),this.containerVisible=!1,this.disableDocumentSettings(),this.$emit("after-hide")},onMaskClick:function(e){this.dismissable&&this.modal&&this.mask===e.target&&this.hide()},focus:function(){var e=function(s){return s&&s.querySelector("[autofocus]")},n=this.$slots.header&&e(this.headerContainer);n||(n=this.$slots.default&&e(this.container),n||(n=this.$slots.footer&&e(this.footerContainer),n||(n=this.closeButton))),n&&T(n)},enableDocumentSettings:function(){this.dismissable&&!this.modal&&this.bindOutsideClickListener(),this.blockScroll&&be()},disableDocumentSettings:function(){this.unbindOutsideClickListener(),this.blockScroll&&ve()},onKeydown:function(e){e.code==="Escape"&&this.hide()},containerRef:function(e){this.container=e},maskRef:function(e){this.mask=e},contentRef:function(e){this.content=e},headerContainerRef:function(e){this.headerContainer=e},footerContainerRef:function(e){this.footerContainer=e},closeButtonRef:function(e){this.closeButton=e?e.$el:void 0},bindDocumentKeyDownListener:function(){this.documentKeydownListener||(this.documentKeydownListener=this.onKeydown,document.addEventListener("keydown",this.documentKeydownListener))},unbindDocumentKeyDownListener:function(){this.documentKeydownListener&&(document.removeEventListener("keydown",this.documentKeydownListener),this.documentKeydownListener=null)},bindOutsideClickListener:function(){var e=this;this.outsideClickListener||(this.outsideClickListener=function(n){e.isOutsideClicked(n)&&e.hide()},document.addEventListener("click",this.outsideClickListener))},unbindOutsideClickListener:function(){this.outsideClickListener&&(document.removeEventListener("click",this.outsideClickListener),this.outsideClickListener=null)},isOutsideClicked:function(e){return this.container&&!this.container.contains(e.target)}},computed:{fullScreen:function(){return this.position==="full"},closeAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria.close:void 0}},directives:{focustrap:Ee},components:{Button:ae,Portal:Q,TimesIcon:ge}},Ke=["aria-modal"];function _e(t,e,n,r,s,i){var u=m("Button"),h=m("Portal"),d=F("focustrap");return o(),S(h,null,{default:v(function(){return[s.containerVisible?(o(),l("div",c({key:0,ref:i.maskRef,onMousedown:e[0]||(e[0]=function(){return i.onMaskClick&&i.onMaskClick.apply(i,arguments)}),class:t.cx("mask"),style:t.sx("mask",!0,{position:t.position,modal:t.modal})},t.ptm("mask")),[g(ee,c({name:"p-drawer",onEnter:i.onEnter,onAfterEnter:i.onAfterEnter,onBeforeLeave:i.onBeforeLeave,onLeave:i.onLeave,onAfterLeave:i.onAfterLeave,appear:""},t.ptm("transition")),{default:v(function(){return[t.visible?_((o(),l("div",c({key:0,ref:i.containerRef,class:t.cx("root"),style:t.sx("root"),role:"complementary","aria-modal":t.modal},t.ptmi("root")),[t.$slots.container?k(t.$slots,"container",{key:0,closeCallback:i.hide}):(o(),l(L,{key:1},[a("div",c({ref:i.headerContainerRef,class:t.cx("header")},t.ptm("header")),[k(t.$slots,"header",{class:I(t.cx("title"))},function(){return[t.header?(o(),l("div",c({key:0,class:t.cx("title")},t.ptm("title")),x(t.header),17)):y("",!0)]}),t.showCloseIcon?(o(),S(u,c({key:0,ref:i.closeButtonRef,type:"button",class:t.cx("pcCloseButton"),"aria-label":i.closeAriaLabel,unstyled:t.unstyled,onClick:i.hide},t.closeButtonProps,{pt:t.ptm("pcCloseButton"),"data-pc-group-section":"iconcontainer"}),{icon:v(function(p){return[k(t.$slots,"closeicon",{},function(){return[(o(),S($(t.closeIcon?"span":"TimesIcon"),c({class:[t.closeIcon,p.class]},t.ptm("pcCloseButton").icon),null,16,["class"]))]})]}),_:3},16,["class","aria-label","unstyled","onClick","pt"])):y("",!0)],16),a("div",c({ref:i.contentRef,class:t.cx("content")},t.ptm("content")),[k(t.$slots,"default")],16),t.$slots.footer?(o(),l("div",c({key:0,ref:i.footerContainerRef,class:t.cx("footer")},t.ptm("footer")),[k(t.$slots,"footer")],16)):y("",!0)],64))],16,Ke)),[[d]]):y("",!0)]}),_:3},16,["onEnter","onAfterEnter","onBeforeLeave","onLeave","onAfterLeave"])],16)):y("",!0)]}),_:3})}Z.render=_e;var $e=function(e){var n=e.dt;return`
.p-menu {
    background: `.concat(n("menu.background"),`;
    color: `).concat(n("menu.color"),`;
    border: 1px solid `).concat(n("menu.border.color"),`;
    border-radius: `).concat(n("menu.border.radius"),`;
    min-width: 12.5rem;
}

.p-menu-list {
    margin: 0;
    padding: `).concat(n("menu.list.padding"),`;
    outline: 0 none;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: `).concat(n("menu.list.gap"),`;
}

.p-menu-item-content {
    transition: background `).concat(n("menu.transition.duration"),", color ").concat(n("menu.transition.duration"),`;
    border-radius: `).concat(n("menu.item.border.radius"),`;
    color: `).concat(n("menu.item.color"),`;
}

.p-menu-item-link {
    cursor: pointer;
    display: flex;
    align-items: center;
    text-decoration: none;
    overflow: hidden;
    position: relative;
    color: inherit;
    padding: `).concat(n("menu.item.padding"),`;
    gap: `).concat(n("menu.item.gap"),`;
    user-select: none;
    outline: 0 none;
}

.p-menu-item-label {
    line-height: 1;
}

.p-menu-item-icon {
    color: `).concat(n("menu.item.icon.color"),`;
}

.p-menu-item.p-focus .p-menu-item-content {
    color: `).concat(n("menu.item.focus.color"),`;
    background: `).concat(n("menu.item.focus.background"),`;
}

.p-menu-item.p-focus .p-menu-item-icon {
    color: `).concat(n("menu.item.icon.focus.color"),`;
}

.p-menu-item:not(.p-disabled) .p-menu-item-content:hover {
    color: `).concat(n("menu.item.focus.color"),`;
    background: `).concat(n("menu.item.focus.background"),`;
}

.p-menu-item:not(.p-disabled) .p-menu-item-content:hover .p-menu-item-icon {
    color: `).concat(n("menu.item.icon.focus.color"),`;
}

.p-menu-overlay {
    box-shadow: `).concat(n("menu.shadow"),`;
}

.p-menu-submenu-label {
    background: `).concat(n("menu.submenu.label.background"),`;
    padding: `).concat(n("menu.submenu.label.padding"),`;
    color: `).concat(n("menu.submenu.label.color"),`;
    font-weight: `).concat(n("menu.submenu.label.font.weight"),`;
}

.p-menu-separator {
    border-block-start: 1px solid `).concat(n("menu.separator.border.color"),`;
}
`)},He={root:function(e){var n=e.props;return["p-menu p-component",{"p-menu-overlay":n.popup}]},start:"p-menu-start",list:"p-menu-list",submenuLabel:"p-menu-submenu-label",separator:"p-menu-separator",end:"p-menu-end",item:function(e){var n=e.instance;return["p-menu-item",{"p-focus":n.id===n.focusedOptionId,"p-disabled":n.disabled()}]},itemContent:"p-menu-item-content",itemLink:"p-menu-item-link",itemIcon:"p-menu-item-icon",itemLabel:"p-menu-item-label"},Ne=R.extend({name:"menu",theme:$e,classes:He}),Ve={name:"BaseMenu",extends:O,props:{popup:{type:Boolean,default:!1},model:{type:Array,default:null},appendTo:{type:[String,Object],default:"body"},autoZIndex:{type:Boolean,default:!0},baseZIndex:{type:Number,default:0},tabindex:{type:Number,default:0},ariaLabel:{type:String,default:null},ariaLabelledby:{type:String,default:null}},style:Ne,provide:function(){return{$pcMenu:this,$parentInstance:this}}},ue={name:"Menuitem",hostName:"Menu",extends:O,inheritAttrs:!1,emits:["item-click","item-mousemove"],props:{item:null,templates:null,id:null,focusedOptionId:null,index:null},methods:{getItemProp:function(e,n){return e&&e.item?ye(e.item[n]):void 0},getPTOptions:function(e){return this.ptm(e,{context:{item:this.item,index:this.index,focused:this.isItemFocused(),disabled:this.disabled()}})},isItemFocused:function(){return this.focusedOptionId===this.id},onItemClick:function(e){var n=this.getItemProp(this.item,"command");n&&n({originalEvent:e,item:this.item.item}),this.$emit("item-click",{originalEvent:e,item:this.item,id:this.id})},onItemMouseMove:function(e){this.$emit("item-mousemove",{originalEvent:e,item:this.item,id:this.id})},visible:function(){return typeof this.item.visible=="function"?this.item.visible():this.item.visible!==!1},disabled:function(){return typeof this.item.disabled=="function"?this.item.disabled():this.item.disabled},label:function(){return typeof this.item.label=="function"?this.item.label():this.item.label},getMenuItemProps:function(e){return{action:c({class:this.cx("itemLink"),tabindex:"-1"},this.getPTOptions("itemLink")),icon:c({class:[this.cx("itemIcon"),e.icon]},this.getPTOptions("itemIcon")),label:c({class:this.cx("itemLabel")},this.getPTOptions("itemLabel"))}}},directives:{ripple:we}},Ue=["id","aria-label","aria-disabled","data-p-focused","data-p-disabled"],Fe=["href","target"];function Ge(t,e,n,r,s,i){var u=F("ripple");return i.visible()?(o(),l("li",c({key:0,id:n.id,class:[t.cx("item"),n.item.class],role:"menuitem",style:n.item.style,"aria-label":i.label(),"aria-disabled":i.disabled()},i.getPTOptions("item"),{"data-p-focused":i.isItemFocused(),"data-p-disabled":i.disabled()||!1}),[a("div",c({class:t.cx("itemContent"),onClick:e[0]||(e[0]=function(h){return i.onItemClick(h)}),onMousemove:e[1]||(e[1]=function(h){return i.onItemMouseMove(h)})},i.getPTOptions("itemContent")),[n.templates.item?n.templates.item?(o(),S($(n.templates.item),{key:1,item:n.item,label:i.label(),props:i.getMenuItemProps(n.item)},null,8,["item","label","props"])):y("",!0):_((o(),l("a",c({key:0,href:n.item.url,class:t.cx("itemLink"),target:n.item.target,tabindex:"-1"},i.getPTOptions("itemLink")),[n.templates.itemicon?(o(),S($(n.templates.itemicon),{key:0,item:n.item,class:I(t.cx("itemIcon"))},null,8,["item","class"])):n.item.icon?(o(),l("span",c({key:1,class:[t.cx("itemIcon"),n.item.icon]},i.getPTOptions("itemIcon")),null,16)):y("",!0),a("span",c({class:t.cx("itemLabel")},i.getPTOptions("itemLabel")),x(i.label()),17)],16,Fe)),[[u]])],16)],16,Ue)):y("",!0)}ue.render=Ge;function q(t){return Xe(t)||We(t)||je(t)||Ze()}function Ze(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function je(t,e){if(t){if(typeof t=="string")return V(t,e);var n={}.toString.call(t).slice(8,-1);return n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set"?Array.from(t):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?V(t,e):void 0}}function We(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function Xe(t){if(Array.isArray(t))return V(t)}function V(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,r=Array(e);n<e;n++)r[n]=t[n];return r}var de={name:"Menu",extends:Ve,inheritAttrs:!1,emits:["show","hide","focus","blur"],data:function(){return{id:this.$attrs.id,overlayVisible:!1,focused:!1,focusedOptionIndex:-1,selectedOptionIndex:-1}},watch:{"$attrs.id":function(e){this.id=e||W()}},target:null,outsideClickListener:null,scrollHandler:null,resizeListener:null,container:null,list:null,mounted:function(){this.id=this.id||W(),this.popup||(this.bindResizeListener(),this.bindOutsideClickListener())},beforeUnmount:function(){this.unbindResizeListener(),this.unbindOutsideClickListener(),this.scrollHandler&&(this.scrollHandler.destroy(),this.scrollHandler=null),this.target=null,this.container&&this.autoZIndex&&P.clear(this.container),this.container=null},methods:{itemClick:function(e){var n=e.item;this.disabled(n)||(n.command&&n.command(e),this.overlayVisible&&this.hide(),!this.popup&&this.focusedOptionIndex!==e.id&&(this.focusedOptionIndex=e.id))},itemMouseMove:function(e){this.focused&&(this.focusedOptionIndex=e.id)},onListFocus:function(e){this.focused=!0,!this.popup&&this.changeFocusedOptionIndex(0),this.$emit("focus",e)},onListBlur:function(e){this.focused=!1,this.focusedOptionIndex=-1,this.$emit("blur",e)},onListKeyDown:function(e){switch(e.code){case"ArrowDown":this.onArrowDownKey(e);break;case"ArrowUp":this.onArrowUpKey(e);break;case"Home":this.onHomeKey(e);break;case"End":this.onEndKey(e);break;case"Enter":case"NumpadEnter":this.onEnterKey(e);break;case"Space":this.onSpaceKey(e);break;case"Escape":this.popup&&(T(this.target),this.hide());case"Tab":this.overlayVisible&&this.hide();break}},onArrowDownKey:function(e){var n=this.findNextOptionIndex(this.focusedOptionIndex);this.changeFocusedOptionIndex(n),e.preventDefault()},onArrowUpKey:function(e){if(e.altKey&&this.popup)T(this.target),this.hide(),e.preventDefault();else{var n=this.findPrevOptionIndex(this.focusedOptionIndex);this.changeFocusedOptionIndex(n),e.preventDefault()}},onHomeKey:function(e){this.changeFocusedOptionIndex(0),e.preventDefault()},onEndKey:function(e){this.changeFocusedOptionIndex(A(this.container,'li[data-pc-section="item"][data-p-disabled="false"]').length-1),e.preventDefault()},onEnterKey:function(e){var n=X(this.list,'li[id="'.concat("".concat(this.focusedOptionIndex),'"]')),r=n&&X(n,'a[data-pc-section="itemlink"]');this.popup&&T(this.target),r?r.click():n&&n.click(),e.preventDefault()},onSpaceKey:function(e){this.onEnterKey(e)},findNextOptionIndex:function(e){var n=A(this.container,'li[data-pc-section="item"][data-p-disabled="false"]'),r=q(n).findIndex(function(s){return s.id===e});return r>-1?r+1:0},findPrevOptionIndex:function(e){var n=A(this.container,'li[data-pc-section="item"][data-p-disabled="false"]'),r=q(n).findIndex(function(s){return s.id===e});return r>-1?r-1:0},changeFocusedOptionIndex:function(e){var n=A(this.container,'li[data-pc-section="item"][data-p-disabled="false"]'),r=e>=n.length?n.length-1:e<0?0:e;r>-1&&(this.focusedOptionIndex=n[r].getAttribute("id"))},toggle:function(e){this.overlayVisible?this.hide():this.show(e)},show:function(e){this.overlayVisible=!0,this.target=e.currentTarget},hide:function(){this.overlayVisible=!1,this.target=null},onEnter:function(e){ke(e,{position:"absolute",top:"0",left:"0"}),this.alignOverlay(),this.bindOutsideClickListener(),this.bindResizeListener(),this.bindScrollListener(),this.autoZIndex&&P.set("menu",e,this.baseZIndex+this.$primevue.config.zIndex.menu),this.popup&&T(this.list),this.$emit("show")},onLeave:function(){this.unbindOutsideClickListener(),this.unbindResizeListener(),this.unbindScrollListener(),this.$emit("hide")},onAfterLeave:function(e){this.autoZIndex&&P.clear(e)},alignOverlay:function(){Le(this.container,this.target);var e=z(this.target);e>z(this.container)&&(this.container.style.minWidth=z(this.target)+"px")},bindOutsideClickListener:function(){var e=this;this.outsideClickListener||(this.outsideClickListener=function(n){var r=e.container&&!e.container.contains(n.target),s=!(e.target&&(e.target===n.target||e.target.contains(n.target)));e.overlayVisible&&r&&s?e.hide():!e.popup&&r&&s&&(e.focusedOptionIndex=-1)},document.addEventListener("click",this.outsideClickListener))},unbindOutsideClickListener:function(){this.outsideClickListener&&(document.removeEventListener("click",this.outsideClickListener),this.outsideClickListener=null)},bindScrollListener:function(){var e=this;this.scrollHandler||(this.scrollHandler=new Se(this.target,function(){e.overlayVisible&&e.hide()})),this.scrollHandler.bindScrollListener()},unbindScrollListener:function(){this.scrollHandler&&this.scrollHandler.unbindScrollListener()},bindResizeListener:function(){var e=this;this.resizeListener||(this.resizeListener=function(){e.overlayVisible&&!xe()&&e.hide()},window.addEventListener("resize",this.resizeListener))},unbindResizeListener:function(){this.resizeListener&&(window.removeEventListener("resize",this.resizeListener),this.resizeListener=null)},visible:function(e){return typeof e.visible=="function"?e.visible():e.visible!==!1},disabled:function(e){return typeof e.disabled=="function"?e.disabled():e.disabled},label:function(e){return typeof e.label=="function"?e.label():e.label},onOverlayClick:function(e){Oe.emit("overlay-click",{originalEvent:e,target:this.target})},containerRef:function(e){this.container=e},listRef:function(e){this.list=e}},computed:{focusedOptionId:function(){return this.focusedOptionIndex!==-1?this.focusedOptionIndex:null}},components:{PVMenuitem:ue,Portal:Q}},Ye=["id"],qe=["id","tabindex","aria-activedescendant","aria-label","aria-labelledby"],Je=["id"];function Qe(t,e,n,r,s,i){var u=m("PVMenuitem"),h=m("Portal");return o(),S(h,{appendTo:t.appendTo,disabled:!t.popup},{default:v(function(){return[g(ee,c({name:"p-connected-overlay",onEnter:i.onEnter,onLeave:i.onLeave,onAfterLeave:i.onAfterLeave},t.ptm("transition")),{default:v(function(){return[!t.popup||s.overlayVisible?(o(),l("div",c({key:0,ref:i.containerRef,id:s.id,class:t.cx("root"),onClick:e[3]||(e[3]=function(){return i.onOverlayClick&&i.onOverlayClick.apply(i,arguments)})},t.ptmi("root")),[t.$slots.start?(o(),l("div",c({key:0,class:t.cx("start")},t.ptm("start")),[k(t.$slots,"start")],16)):y("",!0),a("ul",c({ref:i.listRef,id:s.id+"_list",class:t.cx("list"),role:"menu",tabindex:t.tabindex,"aria-activedescendant":s.focused?i.focusedOptionId:void 0,"aria-label":t.ariaLabel,"aria-labelledby":t.ariaLabelledby,onFocus:e[0]||(e[0]=function(){return i.onListFocus&&i.onListFocus.apply(i,arguments)}),onBlur:e[1]||(e[1]=function(){return i.onListBlur&&i.onListBlur.apply(i,arguments)}),onKeydown:e[2]||(e[2]=function(){return i.onListKeyDown&&i.onListKeyDown.apply(i,arguments)})},t.ptm("list")),[(o(!0),l(L,null,M(t.model,function(d,p){return o(),l(L,{key:i.label(d)+p.toString()},[d.items&&i.visible(d)&&!d.separator?(o(),l(L,{key:0},[d.items?(o(),l("li",c({key:0,id:s.id+"_"+p,class:[t.cx("submenuLabel"),d.class],role:"none",ref_for:!0},t.ptm("submenuLabel")),[k(t.$slots,t.$slots.submenulabel?"submenulabel":"submenuheader",{item:d},function(){return[E(x(i.label(d)),1)]})],16,Je)):y("",!0),(o(!0),l(L,null,M(d.items,function(w,b){return o(),l(L,{key:w.label+p+"_"+b},[i.visible(w)&&!w.separator?(o(),S(u,{key:0,id:s.id+"_"+p+"_"+b,item:w,templates:t.$slots,focusedOptionId:i.focusedOptionId,unstyled:t.unstyled,onItemClick:i.itemClick,onItemMousemove:i.itemMouseMove,pt:t.pt},null,8,["id","item","templates","focusedOptionId","unstyled","onItemClick","onItemMousemove","pt"])):i.visible(w)&&w.separator?(o(),l("li",c({key:"separator"+p+b,class:[t.cx("separator"),d.class],style:w.style,role:"separator",ref_for:!0},t.ptm("separator")),null,16)):y("",!0)],64)}),128))],64)):i.visible(d)&&d.separator?(o(),l("li",c({key:"separator"+p.toString(),class:[t.cx("separator"),d.class],style:d.style,role:"separator",ref_for:!0},t.ptm("separator")),null,16)):(o(),S(u,{key:i.label(d)+p.toString(),id:s.id+"_"+p,item:d,index:p,templates:t.$slots,focusedOptionId:i.focusedOptionId,unstyled:t.unstyled,onItemClick:i.itemClick,onItemMousemove:i.itemMouseMove,pt:t.pt},null,8,["id","item","index","templates","focusedOptionId","unstyled","onItemClick","onItemMousemove","pt"]))],64)}),128))],16,qe),t.$slots.end?(o(),l("div",c({key:1,class:t.cx("end")},t.ptm("end")),[k(t.$slots,"end")],16)):y("",!0)],16,Ye)):y("",!0)]}),_:3},16,["onEnter","onLeave","onAfterLeave"])]}),_:3},8,["appendTo","disabled"])}de.render=Qe;var et=function(e){var n=e.dt;return`
.p-splitter {
    display: flex;
    flex-wrap: nowrap;
    border: 1px solid `.concat(n("splitter.border.color"),`;
    background: `).concat(n("splitter.background"),`;
    border-radius: `).concat(n("border.radius.md"),`;
    color: `).concat(n("splitter.color"),`;
}

.p-splitter-vertical {
    flex-direction: column;
}

.p-splitter-gutter {
    flex-grow: 0;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    background: `).concat(n("splitter.gutter.background"),`;
}

.p-splitter-gutter-handle {
    border-radius: `).concat(n("splitter.handle.border.radius"),`;
    background: `).concat(n("splitter.handle.background"),`;
    transition: outline-color `).concat(n("splitter.transition.duration"),", box-shadow ").concat(n("splitter.transition.duration"),`;
    outline-color: transparent;
}

.p-splitter-gutter-handle:focus-visible {
    box-shadow: `).concat(n("splitter.handle.focus.ring.shadow"),`;
    outline: `).concat(n("splitter.handle.focus.ring.width")," ").concat(n("splitter.handle.focus.ring.style")," ").concat(n("splitter.handle.focus.ring.color"),`;
    outline-offset: `).concat(n("splitter.handle.focus.ring.offset"),`;
}

.p-splitter-horizontal.p-splitter-resizing {
    cursor: col-resize;
    user-select: none;
}

.p-splitter-vertical.p-splitter-resizing {
    cursor: row-resize;
    user-select: none;
}

.p-splitter-horizontal > .p-splitter-gutter > .p-splitter-gutter-handle {
    height: `).concat(n("splitter.handle.size"),`;
    width: 100%;
}

.p-splitter-vertical > .p-splitter-gutter > .p-splitter-gutter-handle {
    width: `).concat(n("splitter.handle.size"),`;
    height: 100%;
}

.p-splitter-horizontal > .p-splitter-gutter {
    cursor: col-resize;
}

.p-splitter-vertical > .p-splitter-gutter {
    cursor: row-resize;
}

.p-splitterpanel {
    flex-grow: 1;
    overflow: hidden;
}

.p-splitterpanel-nested {
    display: flex;
}

.p-splitterpanel .p-splitter {
    flex-grow: 1;
    border: 0 none;
}
`)},tt={root:function(e){var n=e.props;return["p-splitter p-component","p-splitter-"+n.layout]},gutter:"p-splitter-gutter",gutterHandle:"p-splitter-gutter-handle"},nt={root:function(e){var n=e.props;return[{display:"flex","flex-wrap":"nowrap"},n.layout==="vertical"?{"flex-direction":"column"}:""]}},it=R.extend({name:"splitter",theme:et,classes:tt,inlineStyles:nt}),rt={name:"BaseSplitter",extends:O,props:{layout:{type:String,default:"horizontal"},gutterSize:{type:Number,default:4},stateKey:{type:String,default:null},stateStorage:{type:String,default:"session"},step:{type:Number,default:5}},style:it,provide:function(){return{$pcSplitter:this,$parentInstance:this}}};function J(t){return lt(t)||at(t)||ot(t)||st()}function st(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function ot(t,e){if(t){if(typeof t=="string")return U(t,e);var n={}.toString.call(t).slice(8,-1);return n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set"?Array.from(t):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?U(t,e):void 0}}function at(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function lt(t){if(Array.isArray(t))return U(t)}function U(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,r=Array(e);n<e;n++)r[n]=t[n];return r}var ce={name:"Splitter",extends:rt,inheritAttrs:!1,emits:["resizestart","resizeend","resize"],dragging:!1,mouseMoveListener:null,mouseUpListener:null,touchMoveListener:null,touchEndListener:null,size:null,gutterElement:null,startPos:null,prevPanelElement:null,nextPanelElement:null,nextPanelSize:null,prevPanelSize:null,panelSizes:null,prevPanelIndex:null,timer:null,data:function(){return{prevSize:null}},mounted:function(){this.initializePanels()},beforeUnmount:function(){this.clear(),this.unbindMouseListeners()},methods:{isSplitterPanel:function(e){return e.type.name==="SplitterPanel"},initializePanels:function(){var e=this;if(this.panels&&this.panels.length){var n=!1;if(this.isStateful()&&(n=this.restoreState()),!n){var r=J(this.$el.children).filter(function(i){return i.getAttribute("data-pc-name")==="splitterpanel"}),s=[];this.panels.map(function(i,u){var h=i.props&&i.props.size?i.props.size:null,d=h||100/e.panels.length;s[u]=d,r[u].style.flexBasis="calc("+d+"% - "+(e.panels.length-1)*e.gutterSize+"px)"}),this.panelSizes=s,this.prevSize=parseFloat(s[0]).toFixed(4)}}},onResizeStart:function(e,n,r){this.gutterElement=e.currentTarget||e.target.parentElement,this.size=this.horizontal?ze(this.$el):Ie(this.$el),r||(this.dragging=!0,this.startPos=this.layout==="horizontal"?e.pageX||e.changedTouches[0].pageX:e.pageY||e.changedTouches[0].pageY),this.prevPanelElement=this.gutterElement.previousElementSibling,this.nextPanelElement=this.gutterElement.nextElementSibling,r?(this.prevPanelSize=this.horizontal?z(this.prevPanelElement,!0):B(this.prevPanelElement,!0),this.nextPanelSize=this.horizontal?z(this.nextPanelElement,!0):B(this.nextPanelElement,!0)):(this.prevPanelSize=100*(this.horizontal?z(this.prevPanelElement,!0):B(this.prevPanelElement,!0))/this.size,this.nextPanelSize=100*(this.horizontal?z(this.nextPanelElement,!0):B(this.nextPanelElement,!0))/this.size),this.prevPanelIndex=n,this.$emit("resizestart",{originalEvent:e,sizes:this.panelSizes}),this.$refs.gutter[n].setAttribute("data-p-gutter-resizing",!0),this.$el.setAttribute("data-p-resizing",!0)},onResize:function(e,n,r){var s,i,u;r?this.horizontal?(i=100*(this.prevPanelSize+n)/this.size,u=100*(this.nextPanelSize-n)/this.size):(i=100*(this.prevPanelSize-n)/this.size,u=100*(this.nextPanelSize+n)/this.size):(this.horizontal?Ce(this.$el)?s=(this.startPos-e.pageX)*100/this.size:s=(e.pageX-this.startPos)*100/this.size:s=(e.pageY-this.startPos)*100/this.size,i=this.prevPanelSize+s,u=this.nextPanelSize-s),this.validateResize(i,u)&&(this.prevPanelElement.style.flexBasis="calc("+i+"% - "+(this.panels.length-1)*this.gutterSize+"px)",this.nextPanelElement.style.flexBasis="calc("+u+"% - "+(this.panels.length-1)*this.gutterSize+"px)",this.panelSizes[this.prevPanelIndex]=i,this.panelSizes[this.prevPanelIndex+1]=u,this.prevSize=parseFloat(i).toFixed(4)),this.$emit("resize",{originalEvent:e,sizes:this.panelSizes})},onResizeEnd:function(e){this.isStateful()&&this.saveState(),this.$emit("resizeend",{originalEvent:e,sizes:this.panelSizes}),this.$refs.gutter.forEach(function(n){return n.setAttribute("data-p-gutter-resizing",!1)}),this.$el.setAttribute("data-p-resizing",!1),this.clear()},repeat:function(e,n,r){this.onResizeStart(e,n,!0),this.onResize(e,r,!0)},setTimer:function(e,n,r){var s=this;this.timer||(this.timer=setInterval(function(){s.repeat(e,n,r)},40))},clearTimer:function(){this.timer&&(clearInterval(this.timer),this.timer=null)},onGutterKeyUp:function(){this.clearTimer(),this.onResizeEnd()},onGutterKeyDown:function(e,n){switch(e.code){case"ArrowLeft":{this.layout==="horizontal"&&this.setTimer(e,n,this.step*-1),e.preventDefault();break}case"ArrowRight":{this.layout==="horizontal"&&this.setTimer(e,n,this.step),e.preventDefault();break}case"ArrowDown":{this.layout==="vertical"&&this.setTimer(e,n,this.step*-1),e.preventDefault();break}case"ArrowUp":{this.layout==="vertical"&&this.setTimer(e,n,this.step),e.preventDefault();break}}},onGutterMouseDown:function(e,n){this.onResizeStart(e,n),this.bindMouseListeners()},onGutterTouchStart:function(e,n){this.onResizeStart(e,n),this.bindTouchListeners(),e.preventDefault()},onGutterTouchMove:function(e){this.onResize(e),e.preventDefault()},onGutterTouchEnd:function(e){this.onResizeEnd(e),this.unbindTouchListeners(),e.preventDefault()},bindMouseListeners:function(){var e=this;this.mouseMoveListener||(this.mouseMoveListener=function(n){return e.onResize(n)},document.addEventListener("mousemove",this.mouseMoveListener)),this.mouseUpListener||(this.mouseUpListener=function(n){e.onResizeEnd(n),e.unbindMouseListeners()},document.addEventListener("mouseup",this.mouseUpListener))},bindTouchListeners:function(){var e=this;this.touchMoveListener||(this.touchMoveListener=function(n){return e.onResize(n.changedTouches[0])},document.addEventListener("touchmove",this.touchMoveListener)),this.touchEndListener||(this.touchEndListener=function(n){e.resizeEnd(n),e.unbindTouchListeners()},document.addEventListener("touchend",this.touchEndListener))},validateResize:function(e,n){if(e>100||e<0||n>100||n<0)return!1;var r=Y(this.panels[this.prevPanelIndex],"minSize");if(this.panels[this.prevPanelIndex].props&&r&&r>e)return!1;var s=Y(this.panels[this.prevPanelIndex+1],"minSize");return!(this.panels[this.prevPanelIndex+1].props&&s&&s>n)},unbindMouseListeners:function(){this.mouseMoveListener&&(document.removeEventListener("mousemove",this.mouseMoveListener),this.mouseMoveListener=null),this.mouseUpListener&&(document.removeEventListener("mouseup",this.mouseUpListener),this.mouseUpListener=null)},unbindTouchListeners:function(){this.touchMoveListener&&(document.removeEventListener("touchmove",this.touchMoveListener),this.touchMoveListener=null),this.touchEndListener&&(document.removeEventListener("touchend",this.touchEndListener),this.touchEndListener=null)},clear:function(){this.dragging=!1,this.size=null,this.startPos=null,this.prevPanelElement=null,this.nextPanelElement=null,this.prevPanelSize=null,this.nextPanelSize=null,this.gutterElement=null,this.prevPanelIndex=null},isStateful:function(){return this.stateKey!=null},getStorage:function(){switch(this.stateStorage){case"local":return window.localStorage;case"session":return window.sessionStorage;default:throw new Error(this.stateStorage+' is not a valid value for the state storage, supported values are "local" and "session".')}},saveState:function(){Pe(this.panelSizes)&&this.getStorage().setItem(this.stateKey,JSON.stringify(this.panelSizes))},restoreState:function(){var e=this,n=this.getStorage(),r=n.getItem(this.stateKey);if(r){this.panelSizes=JSON.parse(r);var s=J(this.$el.children).filter(function(i){return i.getAttribute("data-pc-name")==="splitterpanel"});return s.forEach(function(i,u){i.style.flexBasis="calc("+e.panelSizes[u]+"% - "+(e.panels.length-1)*e.gutterSize+"px)"}),!0}return!1},resetState:function(){this.initializePanels()}},computed:{panels:function(){var e=this,n=[];return this.$slots.default().forEach(function(r){e.isSplitterPanel(r)?n.push(r):r.children instanceof Array&&r.children.forEach(function(s){e.isSplitterPanel(s)&&n.push(s)})}),n},gutterStyle:function(){return this.horizontal?{width:this.gutterSize+"px"}:{height:this.gutterSize+"px"}},horizontal:function(){return this.layout==="horizontal"},getPTOptions:function(){var e;return{context:{nested:(e=this.$parentInstance)===null||e===void 0?void 0:e.nestedState}}}}},ut=["onMousedown","onTouchstart","onTouchmove","onTouchend"],dt=["aria-orientation","aria-valuenow","onKeydown"];function ct(t,e,n,r,s,i){return o(),l("div",c({class:t.cx("root"),style:t.sx("root"),"data-p-resizing":!1},t.ptmi("root",i.getPTOptions)),[(o(!0),l(L,null,M(i.panels,function(u,h){return o(),l(L,{key:h},[(o(),S($(u),{tabindex:"-1"})),h!==i.panels.length-1?(o(),l("div",c({key:0,ref_for:!0,ref:"gutter",class:t.cx("gutter"),role:"separator",tabindex:"-1",onMousedown:function(p){return i.onGutterMouseDown(p,h)},onTouchstart:function(p){return i.onGutterTouchStart(p,h)},onTouchmove:function(p){return i.onGutterTouchMove(p,h)},onTouchend:function(p){return i.onGutterTouchEnd(p,h)},"data-p-gutter-resizing":!1},t.ptm("gutter")),[a("div",c({class:t.cx("gutterHandle"),tabindex:"0",style:[i.gutterStyle],"aria-orientation":t.layout,"aria-valuenow":s.prevSize,onKeyup:e[0]||(e[0]=function(){return i.onGutterKeyUp&&i.onGutterKeyUp.apply(i,arguments)}),onKeydown:function(p){return i.onGutterKeyDown(p,h)},ref_for:!0},t.ptm("gutterHandle")),null,16,dt)],16,ut)):y("",!0)],64)}),128))],16)}ce.render=ct;var pt={root:function(e){var n=e.instance;return["p-splitterpanel",{"p-splitterpanel-nested":n.isNested}]}},ht=R.extend({name:"splitterpanel",classes:pt}),ft={name:"BaseSplitterPanel",extends:O,props:{size:{type:Number,default:null},minSize:{type:Number,default:null}},style:ht,provide:function(){return{$pcSplitterPanel:this,$parentInstance:this}}},pe={name:"SplitterPanel",extends:ft,inheritAttrs:!1,data:function(){return{nestedState:null}},computed:{isNested:function(){var e=this;return this.$slots.default().some(function(n){return e.nestedState=n.type.name==="Splitter"?!0:null,e.nestedState})},getPTOptions:function(){return{context:{nested:this.isNested}}}}};function mt(t,e,n,r,s,i){return o(),l("div",c({ref:"container",class:t.cx("root")},t.ptmi("root",i.getPTOptions)),[k(t.$slots,"default")],16)}pe.render=mt;var bt=function(e){var n=e.dt;return`
.p-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: `.concat(n("toolbar.padding"),`;
    background: `).concat(n("toolbar.background"),`;
    border: 1px solid `).concat(n("toolbar.border.color"),`;
    color: `).concat(n("toolbar.color"),`;
    border-radius: `).concat(n("toolbar.border.radius"),`;
    gap: `).concat(n("toolbar.gap"),`;
}

.p-toolbar-start,
.p-toolbar-center,
.p-toolbar-end {
    display: flex;
    align-items: center;
}
`)},vt={root:"p-toolbar p-component",start:"p-toolbar-start",center:"p-toolbar-center",end:"p-toolbar-end"},gt=R.extend({name:"toolbar",theme:bt,classes:vt}),yt={name:"BaseToolbar",extends:O,props:{ariaLabelledby:{type:String,default:null}},style:gt,provide:function(){return{$pcToolbar:this,$parentInstance:this}}},he={name:"Toolbar",extends:yt,inheritAttrs:!1},wt=["aria-labelledby"];function kt(t,e,n,r,s,i){return o(),l("div",c({class:t.cx("root"),role:"toolbar","aria-labelledby":t.ariaLabelledby},t.ptmi("root")),[a("div",c({class:t.cx("start")},t.ptm("start")),[k(t.$slots,"start")],16),a("div",c({class:t.cx("center")},t.ptm("center")),[k(t.$slots,"center")],16),a("div",c({class:t.cx("end")},t.ptm("end")),[k(t.$slots,"end")],16)],16,wt)}he.render=kt;const fe="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20aria-hidden='true'%20role='img'%20class='iconify%20iconify--logos'%20width='37.07'%20height='36'%20preserveAspectRatio='xMidYMid%20meet'%20viewBox='0%200%20256%20198'%3e%3cpath%20fill='%2341B883'%20d='M204.8%200H256L128%20220.8L0%200h97.92L128%2051.2L157.44%200h47.36Z'%3e%3c/path%3e%3cpath%20fill='%2341B883'%20d='m0%200l128%20220.8L256%200h-51.2L128%20132.48L50.56%200H0Z'%3e%3c/path%3e%3cpath%20fill='%2335495E'%20d='M50.56%200L128%20133.12L204.8%200h-47.36L128%2051.2L97.92%200H50.56Z'%3e%3c/path%3e%3c/svg%3e",Lt={components:{Toolbar:he,OverlayBadge:se,Select:oe,Drawer:Z,Divider:le},setup(){const t=te(),{hotels:e,selectedHotelId:n}=ie(),{holdReservations:r,fetchMyHoldReservations:s,reservationId:i,setReservationId:u}=re(),h=K(!1),d=p=>{u(p),t.push({name:"ReservationsNew"}),h.value=!1};return N(async()=>{await s()}),ne(n,(p,w)=>{},{immediate:!0}),{hotels:e,selectedHotelId:n,holdReservations:r,showDrawer:h,goToNewReservationPage:d}},methods:{}},St={class:"flex items-center space-x-4"},xt={key:0},zt=["onClick"],It={key:1,class:"text-center text-gray-500"};function Ct(t,e,n,r,s,i){const u=m("OverlayBadge"),h=m("Select"),d=m("Toolbar"),p=m("Divider"),w=m("Drawer");return o(),l(L,null,[g(d,{class:"bg-gray-100 border-b border-gray-300 shadow-md"},{start:v(()=>e[3]||(e[3]=[a("div",{class:"flex items-center space-x-4"},[a("img",{src:fe,alt:"Hotel PMS",class:"h-8"}),a("h1",{class:"text-lg font-semibold text-gray-700"},"Hotel PMS")],-1)])),end:v(()=>[a("div",St,[g(u,{value:r.holdReservations.length,class:"mr-2"},{default:v(()=>[a("button",{class:"p-button p-button-text","aria-label":"Notifications",onClick:e[0]||(e[0]=b=>r.showDrawer=!0)},e[4]||(e[4]=[a("i",{class:"pi pi-bell",style:{"font-size":"larger"}},null,-1)]))]),_:1},8,["value"]),g(h,{name:"hotel",modelValue:r.selectedHotelId,"onUpdate:modelValue":e[1]||(e[1]=b=>r.selectedHotelId=b),options:r.hotels,optionLabel:"name",optionValue:"id",virtualScrollerOptions:{itemSize:38},class:"w-48",placeholder:"Hotel Selector",filter:""},null,8,["modelValue","options"])])]),_:1}),g(w,{visible:r.showDrawer,"onUpdate:visible":e[2]||(e[2]=b=>r.showDrawer=b),position:"right",style:{width:"300px"},header:"Notifications"},{default:v(()=>[r.holdReservations.length?(o(),l("ul",xt,[(o(!0),l(L,null,M(r.holdReservations,(b,C)=>(o(),l("li",{key:C,class:"m-2"},[a("button",{onClick:D=>r.goToNewReservationPage(b.reservation_id)},[E(x(b.hotel_id),1),e[5]||(e[5]=a("p",null,"Hold Reservation needs attention: ",-1)),E(" "+x(b.client_name)+" @ "+x(b.check_in),1)],8,zt),g(p)]))),128))])):(o(),l("p",It,"No notifications available."))]),_:1},8,["visible"])],64)}const Pt=G(Lt,[["render",Ct],["__scopeId","data-v-e35eb93c"]]),Et={components:{Menu:de,Menubar:Te,OverlayBadge:se,Select:oe,Drawer:Z,Divider:le,Button:ae},props:{isCollapsed:{type:Boolean,required:!0}},setup(){const t=te(),{hotels:e,selectedHotelId:n,fetchHotels:r}=ie(),{holdReservations:s,fetchMyHoldReservations:i,setReservationId:u}=re(),h=K({}),d=K([{key:"dashboard",label:"Dashboard",icon:"pi pi-fw pi-chart-bar",route:"/dashboard"},{key:"reservations",label:"Reservations",icon:"pi pi-fw pi-calendar",items:[{key:"reservationsNew",label:"New Reservation",icon:"pi pi-fw pi-plus",command:()=>{b()}},{key:"reservationsView",label:"View Reservations",icon:"pi pi-fw pi-eye",command:()=>{t.push("/reservations/calendar")}}]},{key:"reports",label:"Reports",icon:"pi pi-fw pi-file",items:[{label:"Daily Report",icon:"pi pi-fw pi-calendar",command:()=>{t.push("/reports/daily")}},{label:"Monthly Report",icon:"pi pi-fw pi-calendar-plus",command:()=>{t.push("/reports/monthly")}}]}]),p=K(!1),w=C=>{u(C),t.push({name:"ReservationsNew"}),p.value=!1},b=()=>{u(null),t.push({name:"ReservationsNew"})};return N(()=>{r()}),N(async()=>{await i()}),ne(n,(C,D)=>{},{immediate:!0}),{expandedKeys:h,items:d,hotels:e,selectedHotelId:n,holdReservations:s,showDrawer:p,goToNewReservationPage:w,goToNewReservation:b}},emits:["toggle"],methods:{toggleSidebar(){this.$emit("toggle")},handleLogout(){localStorage.removeItem("authToken"),this.$router.push("/login")}}},Ot={class:"flex bg-gray-100 m-0 p-0 w-full"},Tt={class:"w-full bg-emerald-500 text-white m-0 flex flex-col h-full hidden md:block overflow-auto no-scroll"},Mt={class:"grid grid-cols-2 items-center"},Rt={key:0,class:"justify-items-start"},Dt=["href","onClick"],At={class:"ml-2"},Bt=["href","target"],Kt={class:"ml-2"},_t={key:0,class:"pi pi-angle-down text-primary ml-auto"},$t={key:1,class:"mt-auto"},Ht={class:"flex bg-gray-100 m-0 p-0 block w-full md:hidden"},Nt={class:"flex items-center gap-2"},Vt={key:0},Ut=["onClick"],Ft={key:1,class:"text-center text-gray-500"};function Gt(t,e,n,r,s,i){const u=m("router-link"),h=m("Menu"),d=m("OverlayBadge"),p=m("Select"),w=m("Menubar"),b=m("Divider"),C=m("Drawer"),D=F("ripple");return o(),l(L,null,[a("div",Ot,[a("div",Tt,[a("div",Mt,[a("div",null,[a("button",{onClick:e[0]||(e[0]=(...f)=>i.toggleSidebar&&i.toggleSidebar(...f)),class:"p-2 bg-gray-800 text-white rounded-full m-2 p-2","aria-label":"Toggle Sidebar"},[a("i",{class:I(["pi",n.isCollapsed?"pi-arrow-right":"pi-arrow-left"])},null,2)])]),n.isCollapsed?y("",!0):(o(),l("div",Rt,[g(u,{to:"/",class:"text-white p-2 block rounded"},{default:v(()=>e[6]||(e[6]=[a("h2",{class:"text-xl font-semibold"},"PMS",-1)])),_:1})]))]),n.isCollapsed?y("",!0):(o(),S(h,{key:0,model:r.items,class:"flex-1 overflow-auto"},{item:v(({item:f})=>[f.route?(o(),S(u,{key:0,to:f.route,custom:""},{default:v(({href:H,navigate:j})=>[_((o(),l("a",{class:"flex items-center cursor-pointer text-surface-700 dark:text-surface-0 px-4 py-2",href:H,onClick:j},[a("span",{class:I(f.icon)},null,2),a("span",At,x(f.label),1)],8,Dt)),[[D]])]),_:2},1032,["to"])):_((o(),l("a",{key:1,class:"flex items-center cursor-pointer text-surface-700 dark:text-surface-0 px-4 py-2",href:f.url,target:f.target},[a("span",{class:I(f.icon)},null,2),a("span",Kt,x(f.label),1),f.items?(o(),l("span",_t)):y("",!0)],8,Bt)),[[D]])]),_:1},8,["model"])),n.isCollapsed?y("",!0):(o(),l("div",$t,[g(u,{to:"/admin",class:"text-white hover:bg-yellow-100 p-2 block rounded mt-4"},{default:v(()=>e[7]||(e[7]=[a("i",{class:"pi pi-cog mr-2"},null,-1),E("Admin Panel ")])),_:1}),a("button",{onClick:e[1]||(e[1]=(...f)=>i.handleLogout&&i.handleLogout(...f)),class:"w-full text-white bg-transparent hover:bg-red-500 hover:border-red-500 p-2 block rounded mt-4"},e[8]||(e[8]=[a("i",{class:"pi pi-sign-out mr-2"},null,-1),E("Logout ")]))]))])]),a("div",Ht,[g(w,{model:r.items,class:"w-full mb-2"},{start:v(()=>e[9]||(e[9]=[a("img",{src:fe,alt:"Hotel PMS",class:"h-8"},null,-1)])),end:v(()=>[a("div",Nt,[g(d,{value:r.holdReservations.length,class:"mr-2"},{default:v(()=>[a("button",{class:"p-button p-button-text","aria-label":"Notifications",onClick:e[2]||(e[2]=f=>r.showDrawer=!0)},e[10]||(e[10]=[a("i",{class:"pi pi-bell",style:{"font-size":"larger"}},null,-1)]))]),_:1},8,["value"]),g(p,{name:"hotel",modelValue:r.selectedHotelId,"onUpdate:modelValue":e[3]||(e[3]=f=>r.selectedHotelId=f),options:r.hotels,optionLabel:"name",optionValue:"id",virtualScrollerOptions:{itemSize:38},class:"w-48",placeholder:"Hotel Selector",filter:""},null,8,["modelValue","options"]),g(u,{to:"/",class:"text-primary hover:bg-yellow-100 p-2 block rounded flex items-end"},{default:v(()=>e[11]||(e[11]=[a("i",{class:"pi pi-home"},null,-1)])),_:1}),a("button",{onClick:e[4]||(e[4]=(...f)=>i.handleLogout&&i.handleLogout(...f)),class:"text-red-500 bg-transparent hover:bg-red-500 hover:border-red-500 p-2 block rounded items-end"},e[12]||(e[12]=[a("i",{class:"pi pi-sign-out"},null,-1)]))])]),_:1},8,["model"]),g(C,{visible:r.showDrawer,"onUpdate:visible":e[5]||(e[5]=f=>r.showDrawer=f),position:"right",style:{width:"300px"},header:"Notifications"},{default:v(()=>[r.holdReservations.length?(o(),l("ul",Vt,[(o(!0),l(L,null,M(r.holdReservations,(f,H)=>(o(),l("li",{key:H,class:"m-2"},[a("button",{onClick:j=>r.goToNewReservationPage(f.reservation_id)},[e[13]||(e[13]=a("p",null,"Hold Reservation needs attention: ",-1)),E(" "+x(f.client_name)+" @ "+x(f.check_in),1)],8,Ut),g(b)]))),128))])):(o(),l("p",Ft,"No notifications available."))]),_:1},8,["visible"])])],64)}const Zt=G(Et,[["render",Gt],["__scopeId","data-v-38b7fc83"]]),jt={components:{TopMenu:Pt,SideMenu:Zt,Splitter:ce,SplitterPanel:pe},data(){return{isCollapsed:!1}},computed:{sidebarClass(){return{"bg-emerald-500 text-white":!0,"col-span-12 md:col-span-3 lg:col-span-2 md:min-h-screen":!this.isCollapsed,"col-span-1 min-h-screen":this.isCollapsed}},mainContentClass(){return{"col-span-12 md:col-span-9 lg:col-span-10 min-h-screen":!this.isCollapsed,"col-span-11 min-h-screen":this.isCollapsed}}},setup(){},methods:{toggleSidebar(){this.isCollapsed=!this.isCollapsed}}},Wt={class:"min-h-screen"},Xt={class:"grid grid-cols-12 bg-gray-100"},Yt={class:"col-span-12 hidden mb-1 md:block"};function qt(t,e,n,r,s,i){const u=m("TopMenu"),h=m("SideMenu"),d=m("router-view");return o(),l("div",Wt,[a("div",Xt,[a("div",Yt,[g(u)]),a("div",{class:I(i.sidebarClass)},[g(h,{isCollapsed:s.isCollapsed,onToggle:i.toggleSidebar},null,8,["isCollapsed","onToggle"])],2),a("div",{class:I(i.mainContentClass)},[g(d)],2)])])}const un=G(jt,[["render",qt]]);export{un as default};
//# sourceMappingURL=MainPage-Bmry9cdP.js.map
