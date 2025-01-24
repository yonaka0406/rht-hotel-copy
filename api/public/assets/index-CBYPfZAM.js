import{B as Q,aX as se,s as re,o as r,c as a,r as p,m as s,A as y,C as w,e as h,t as O,U as j,Z as U,ao as T,p as F,E as ae,aJ as ce,aP as ue,k as z,N as de,O as pe,P as he,Q as fe,S as me,V as ge,aU as be,l as x,ak as H,v as ye,aC as ve,H as Oe,R as Ie,W as Se,ad as ke,aw as we,b as I,x as Le,d as v,F as M,f as A,y as $,a as V,w as S,n as k,T as Ce,am as Fe,a1 as xe,z as Ve}from"./index-D1uxBxpa.js";import{s as Ke}from"./index-DU-Aobhb.js";import{c as Te,a as Me,b as Ae,d as Ee}from"./index-SJxkweTD.js";import{b as De}from"./index-CZva3LPW.js";import{d as Pe}from"./index-BIeAlUJT.js";import{s as Re,a as ze}from"./index-B_dfm8Z3.js";import{O as He}from"./index-UcX-Yj_6.js";var Be=function(e){var n=e.dt;return`
.p-chip {
    display: inline-flex;
    align-items: center;
    background: `.concat(n("chip.background"),`;
    color: `).concat(n("chip.color"),`;
    border-radius: `).concat(n("chip.border.radius"),`;
    padding-block: `).concat(n("chip.padding.y"),`;
    padding-inline: `).concat(n("chip.padding.x"),`;
    gap: `).concat(n("chip.gap"),`;
}

.p-chip-icon {
    color: `).concat(n("chip.icon.color"),`;
    font-size: `).concat(n("chip.icon.font.size"),`;
    width: `).concat(n("chip.icon.size"),`;
    height: `).concat(n("chip.icon.size"),`;
}

.p-chip-image {
    border-radius: 50%;
    width: `).concat(n("chip.image.width"),`;
    height: `).concat(n("chip.image.height"),`;
    margin-inline-start: calc(-1 * `).concat(n("chip.padding.y"),`);
}

.p-chip:has(.p-chip-remove-icon) {
    padding-inline-end: `).concat(n("chip.padding.y"),`;
}

.p-chip:has(.p-chip-image) {
    padding-block-start: calc(`).concat(n("chip.padding.y"),` / 2);
    padding-block-end: calc(`).concat(n("chip.padding.y"),` / 2);
}

.p-chip-remove-icon {
    cursor: pointer;
    font-size: `).concat(n("chip.remove.icon.size"),`;
    width: `).concat(n("chip.remove.icon.size"),`;
    height: `).concat(n("chip.remove.icon.size"),`;
    color: `).concat(n("chip.remove.icon.color"),`;
    border-radius: 50%;
    transition: outline-color `).concat(n("chip.transition.duration"),", box-shadow ").concat(n("chip.transition.duration"),`;
    outline-color: transparent;
}

.p-chip-remove-icon:focus-visible {
    box-shadow: `).concat(n("chip.remove.icon.focus.ring.shadow"),`;
    outline: `).concat(n("chip.remove.icon.focus.ring.width")," ").concat(n("chip.remove.icon.focus.ring.style")," ").concat(n("chip.remove.icon.focus.ring.color"),`;
    outline-offset: `).concat(n("chip.remove.icon.focus.ring.offset"),`;
}
`)},Ge={root:"p-chip p-component",image:"p-chip-image",icon:"p-chip-icon",label:"p-chip-label",removeIcon:"p-chip-remove-icon"},Ue=Q.extend({name:"chip",theme:Be,classes:Ge}),Ne={name:"BaseChip",extends:re,props:{label:{type:String,default:null},icon:{type:String,default:null},image:{type:String,default:null},removable:{type:Boolean,default:!1},removeIcon:{type:String,default:void 0}},style:Ue,provide:function(){return{$pcChip:this,$parentInstance:this}}},X={name:"Chip",extends:Ne,inheritAttrs:!1,emits:["remove"],data:function(){return{visible:!0}},methods:{onKeydown:function(e){(e.key==="Enter"||e.key==="Backspace")&&this.close(e)},close:function(e){this.visible=!1,this.$emit("remove",e)}},components:{TimesCircleIcon:se}},je=["aria-label"],$e=["src"];function qe(t,e,n,l,o,i){return o.visible?(r(),a("div",s({key:0,class:t.cx("root"),"aria-label":t.label},t.ptmi("root")),[p(t.$slots,"default",{},function(){return[t.image?(r(),a("img",s({key:0,src:t.image},t.ptm("image"),{class:t.cx("image")}),null,16,$e)):t.$slots.icon?(r(),y(w(t.$slots.icon),s({key:1,class:t.cx("icon")},t.ptm("icon")),null,16,["class"])):t.icon?(r(),a("span",s({key:2,class:[t.cx("icon"),t.icon]},t.ptm("icon")),null,16)):h("",!0),t.label?(r(),a("div",s({key:3,class:t.cx("label")},t.ptm("label")),O(t.label),17)):h("",!0)]}),t.removable?p(t.$slots,"removeicon",{key:0,removeCallback:i.close,keydownCallback:i.onKeydown},function(){return[(r(),y(w(t.removeIcon?"span":"TimesCircleIcon"),s({class:[t.cx("removeIcon"),t.removeIcon],onClick:i.close,onKeydown:i.onKeydown},t.ptm("removeIcon")),null,16,["class","onClick","onKeydown"]))]}):h("",!0)],16,je)):h("",!0)}X.render=qe;var We=function(e){var n=e.dt;return`
.p-multiselect {
    display: inline-flex;
    cursor: pointer;
    position: relative;
    user-select: none;
    background: `.concat(n("multiselect.background"),`;
    border: 1px solid `).concat(n("multiselect.border.color"),`;
    transition: background `).concat(n("multiselect.transition.duration"),", color ").concat(n("multiselect.transition.duration"),", border-color ").concat(n("multiselect.transition.duration"),", outline-color ").concat(n("multiselect.transition.duration"),", box-shadow ").concat(n("multiselect.transition.duration"),`;
    border-radius: `).concat(n("multiselect.border.radius"),`;
    outline-color: transparent;
    box-shadow: `).concat(n("multiselect.shadow"),`;
}

.p-multiselect:not(.p-disabled):hover {
    border-color: `).concat(n("multiselect.hover.border.color"),`;
}

.p-multiselect:not(.p-disabled).p-focus {
    border-color: `).concat(n("multiselect.focus.border.color"),`;
    box-shadow: `).concat(n("multiselect.focus.ring.shadow"),`;
    outline: `).concat(n("multiselect.focus.ring.width")," ").concat(n("multiselect.focus.ring.style")," ").concat(n("multiselect.focus.ring.color"),`;
    outline-offset: `).concat(n("multiselect.focus.ring.offset"),`;
}

.p-multiselect.p-variant-filled {
    background: `).concat(n("multiselect.filled.background"),`;
}

.p-multiselect.p-variant-filled:not(.p-disabled):hover {
    background: `).concat(n("multiselect.filled.hover.background"),`;
}

.p-multiselect.p-variant-filled.p-focus {
    background: `).concat(n("multiselect.filled.focus.background"),`;
}

.p-multiselect.p-invalid {
    border-color: `).concat(n("multiselect.invalid.border.color"),`;
}

.p-multiselect.p-disabled {
    opacity: 1;
    background: `).concat(n("multiselect.disabled.background"),`;
}

.p-multiselect-dropdown {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: transparent;
    color: `).concat(n("multiselect.dropdown.color"),`;
    width: `).concat(n("multiselect.dropdown.width"),`;
    border-start-end-radius: `).concat(n("multiselect.border.radius"),`;
    border-end-end-radius: `).concat(n("multiselect.border.radius"),`;
}

.p-multiselect-clear-icon {
    position: absolute;
    top: 50%;
    margin-top: -0.5rem;
    color: `).concat(n("multiselect.clear.icon.color"),`;
    inset-inline-end: `).concat(n("multiselect.dropdown.width"),`;
}

.p-multiselect-label-container {
    overflow: hidden;
    flex: 1 1 auto;
    cursor: pointer;
}

.p-multiselect-label {
    display: flex;
    align-items: center;
    gap: calc(`).concat(n("multiselect.padding.y"),` / 2);
    white-space: nowrap;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: `).concat(n("multiselect.padding.y")," ").concat(n("multiselect.padding.x"),`;
    color: `).concat(n("multiselect.color"),`;
}

.p-multiselect-label.p-placeholder {
    color: `).concat(n("multiselect.placeholder.color"),`;
}

.p-multiselect.p-invalid .p-multiselect-label.p-placeholder {
    color: `).concat(n("multiselect.invalid.placeholder.color"),`;
}

.p-multiselect.p-disabled .p-multiselect-label {
    color: `).concat(n("multiselect.disabled.color"),`;
}

.p-multiselect-label-empty {
    overflow: hidden;
    visibility: hidden;
}

.p-multiselect .p-multiselect-overlay {
    min-width: 100%;
}

.p-multiselect-overlay {
    position: absolute;
    top: 0;
    left: 0;
    background: `).concat(n("multiselect.overlay.background"),`;
    color: `).concat(n("multiselect.overlay.color"),`;
    border: 1px solid `).concat(n("multiselect.overlay.border.color"),`;
    border-radius: `).concat(n("multiselect.overlay.border.radius"),`;
    box-shadow: `).concat(n("multiselect.overlay.shadow"),`;
}

.p-multiselect-header {
    display: flex;
    align-items: center;
    padding: `).concat(n("multiselect.list.header.padding"),`;
}

.p-multiselect-header .p-checkbox {
    margin-inline-end: `).concat(n("multiselect.option.gap"),`;
}

.p-multiselect-filter-container {
    flex: 1 1 auto;
}

.p-multiselect-filter {
    width: 100%;
}

.p-multiselect-list-container {
    overflow: auto;
}

.p-multiselect-list {
    margin: 0;
    padding: 0;
    list-style-type: none;
    padding: `).concat(n("multiselect.list.padding"),`;
    display: flex;
    flex-direction: column;
    gap: `).concat(n("multiselect.list.gap"),`;
}

.p-multiselect-option {
    cursor: pointer;
    font-weight: normal;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: `).concat(n("multiselect.option.gap"),`;
    padding: `).concat(n("multiselect.option.padding"),`;
    border: 0 none;
    color: `).concat(n("multiselect.option.color"),`;
    background: transparent;
    transition: background `).concat(n("multiselect.transition.duration"),", color ").concat(n("multiselect.transition.duration"),", border-color ").concat(n("multiselect.transition.duration"),", box-shadow ").concat(n("multiselect.transition.duration"),", outline-color ").concat(n("multiselect.transition.duration"),`;
    border-radius: `).concat(n("multiselect.option.border.radius"),`;
}

.p-multiselect-option:not(.p-multiselect-option-selected):not(.p-disabled).p-focus {
    background: `).concat(n("multiselect.option.focus.background"),`;
    color: `).concat(n("multiselect.option.focus.color"),`;
}

.p-multiselect-option.p-multiselect-option-selected {
    background: `).concat(n("multiselect.option.selected.background"),`;
    color: `).concat(n("multiselect.option.selected.color"),`;
}

.p-multiselect-option.p-multiselect-option-selected.p-focus {
    background: `).concat(n("multiselect.option.selected.focus.background"),`;
    color: `).concat(n("multiselect.option.selected.focus.color"),`;
}

.p-multiselect-option-group {
    cursor: auto;
    margin: 0;
    padding: `).concat(n("multiselect.option.group.padding"),`;
    background: `).concat(n("multiselect.option.group.background"),`;
    color: `).concat(n("multiselect.option.group.color"),`;
    font-weight: `).concat(n("multiselect.option.group.font.weight"),`;
}

.p-multiselect-empty-message {
    padding: `).concat(n("multiselect.empty.message.padding"),`;
}

.p-multiselect-label .p-chip {
    padding-block-start: calc(`).concat(n("multiselect.padding.y"),` / 2);
    padding-block-end: calc(`).concat(n("multiselect.padding.y"),` / 2);
    border-radius: `).concat(n("multiselect.chip.border.radius"),`;
}

.p-multiselect-label:has(.p-chip) {
    padding: calc(`).concat(n("multiselect.padding.y")," / 2) calc(").concat(n("multiselect.padding.x"),` / 2);
}

.p-multiselect-fluid {
    display: flex;
    width: 100%;
}

.p-multiselect-sm .p-multiselect-label {
    font-size: `).concat(n("multiselect.sm.font.size"),`;
    padding-block: `).concat(n("multiselect.sm.padding.y"),`;
    padding-inline: `).concat(n("multiselect.sm.padding.x"),`;
}

.p-multiselect-sm .p-multiselect-dropdown .p-icon {
    font-size: `).concat(n("multiselect.sm.font.size"),`;
    width: `).concat(n("multiselect.sm.font.size"),`;
    height: `).concat(n("multiselect.sm.font.size"),`;
}

.p-multiselect-lg .p-multiselect-label {
    font-size: `).concat(n("multiselect.lg.font.size"),`;
    padding-block: `).concat(n("multiselect.lg.padding.y"),`;
    padding-inline: `).concat(n("multiselect.lg.padding.x"),`;
}

.p-multiselect-lg .p-multiselect-dropdown .p-icon {
    font-size: `).concat(n("multiselect.lg.font.size"),`;
    width: `).concat(n("multiselect.lg.font.size"),`;
    height: `).concat(n("multiselect.lg.font.size"),`;
}
`)},Ze={root:function(e){var n=e.props;return{position:n.appendTo==="self"?"relative":void 0}}},Je={root:function(e){var n=e.instance,l=e.props;return["p-multiselect p-component p-inputwrapper",{"p-multiselect-display-chip":l.display==="chip","p-disabled":l.disabled,"p-invalid":n.$invalid,"p-variant-filled":n.$variant==="filled","p-focus":n.focused,"p-inputwrapper-filled":n.$filled,"p-inputwrapper-focus":n.focused||n.overlayVisible,"p-multiselect-open":n.overlayVisible,"p-multiselect-fluid":n.$fluid,"p-multiselect-sm p-inputfield-sm":l.size==="small","p-multiselect-lg p-inputfield-lg":l.size==="large"}]},labelContainer:"p-multiselect-label-container",label:function(e){var n=e.instance,l=e.props;return["p-multiselect-label",{"p-placeholder":n.label===l.placeholder,"p-multiselect-label-empty":!l.placeholder&&(!l.modelValue||l.modelValue.length===0)}]},clearIcon:"p-multiselect-clear-icon",chipItem:"p-multiselect-chip-item",pcChip:"p-multiselect-chip",chipIcon:"p-multiselect-chip-icon",dropdown:"p-multiselect-dropdown",loadingIcon:"p-multiselect-loading-icon",dropdownIcon:"p-multiselect-dropdown-icon",overlay:"p-multiselect-overlay p-component",header:"p-multiselect-header",pcFilterContainer:"p-multiselect-filter-container",pcFilter:"p-multiselect-filter",listContainer:"p-multiselect-list-container",list:"p-multiselect-list",optionGroup:"p-multiselect-option-group",option:function(e){var n=e.instance,l=e.option,o=e.index,i=e.getItemOptions,d=e.props;return["p-multiselect-option",{"p-multiselect-option-selected":n.isSelected(l)&&d.highlightOnSelect,"p-focus":n.focusedOptionIndex===n.getOptionIndex(o,i),"p-disabled":n.isOptionDisabled(l)}]},emptyMessage:"p-multiselect-empty-message"},Qe=Q.extend({name:"multiselect",theme:We,classes:Je,inlineStyles:Ze}),Xe={name:"BaseMultiSelect",extends:ze,props:{options:Array,optionLabel:null,optionValue:null,optionDisabled:null,optionGroupLabel:null,optionGroupChildren:null,scrollHeight:{type:String,default:"14rem"},placeholder:String,inputId:{type:String,default:null},panelClass:{type:String,default:null},panelStyle:{type:null,default:null},overlayClass:{type:String,default:null},overlayStyle:{type:null,default:null},dataKey:null,showClear:{type:Boolean,default:!1},clearIcon:{type:String,default:void 0},resetFilterOnClear:{type:Boolean,default:!1},filter:Boolean,filterPlaceholder:String,filterLocale:String,filterMatchMode:{type:String,default:"contains"},filterFields:{type:Array,default:null},appendTo:{type:[String,Object],default:"body"},display:{type:String,default:"comma"},selectedItemsLabel:{type:String,default:null},maxSelectedLabels:{type:Number,default:null},selectionLimit:{type:Number,default:null},showToggleAll:{type:Boolean,default:!0},loading:{type:Boolean,default:!1},checkboxIcon:{type:String,default:void 0},dropdownIcon:{type:String,default:void 0},filterIcon:{type:String,default:void 0},loadingIcon:{type:String,default:void 0},removeTokenIcon:{type:String,default:void 0},chipIcon:{type:String,default:void 0},selectAll:{type:Boolean,default:null},resetFilterOnHide:{type:Boolean,default:!1},virtualScrollerOptions:{type:Object,default:null},autoOptionFocus:{type:Boolean,default:!1},autoFilterFocus:{type:Boolean,default:!1},focusOnHover:{type:Boolean,default:!0},highlightOnSelect:{type:Boolean,default:!1},filterMessage:{type:String,default:null},selectionMessage:{type:String,default:null},emptySelectionMessage:{type:String,default:null},emptyFilterMessage:{type:String,default:null},emptyMessage:{type:String,default:null},tabindex:{type:Number,default:0},ariaLabel:{type:String,default:null},ariaLabelledby:{type:String,default:null}},style:Qe,provide:function(){return{$pcMultiSelect:this,$parentInstance:this}}};function E(t){"@babel/helpers - typeof";return E=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},E(t)}function q(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(t);e&&(l=l.filter(function(o){return Object.getOwnPropertyDescriptor(t,o).enumerable})),n.push.apply(n,l)}return n}function W(t){for(var e=1;e<arguments.length;e++){var n=arguments[e]!=null?arguments[e]:{};e%2?q(Object(n),!0).forEach(function(l){Y(t,l,n[l])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):q(Object(n)).forEach(function(l){Object.defineProperty(t,l,Object.getOwnPropertyDescriptor(n,l))})}return t}function Y(t,e,n){return(e=Ye(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function Ye(t){var e=_e(t,"string");return E(e)=="symbol"?e:e+""}function _e(t,e){if(E(t)!="object"||!t)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var l=n.call(t,e||"default");if(E(l)!="object")return l;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function Z(t){return it(t)||nt(t)||tt(t)||et()}function et(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function tt(t,e){if(t){if(typeof t=="string")return N(t,e);var n={}.toString.call(t).slice(8,-1);return n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set"?Array.from(t):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?N(t,e):void 0}}function nt(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function it(t){if(Array.isArray(t))return N(t)}function N(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,l=Array(e);n<e;n++)l[n]=t[n];return l}var lt={name:"MultiSelect",extends:Xe,inheritAttrs:!1,emits:["change","focus","blur","before-show","before-hide","show","hide","filter","selectall-change"],inject:{$pcFluid:{default:null}},outsideClickListener:null,scrollHandler:null,resizeListener:null,overlay:null,list:null,virtualScroller:null,startRangeIndex:-1,searchTimeout:null,searchValue:"",selectOnFocus:!1,data:function(){return{id:this.$attrs.id,clicked:!1,focused:!1,focusedOptionIndex:-1,filterValue:null,overlayVisible:!1}},watch:{"$attrs.id":function(e){this.id=e||j()},options:function(){this.autoUpdateModel()}},mounted:function(){this.id=this.id||j(),this.autoUpdateModel()},beforeUnmount:function(){this.unbindOutsideClickListener(),this.unbindResizeListener(),this.scrollHandler&&(this.scrollHandler.destroy(),this.scrollHandler=null),this.overlay&&(U.clear(this.overlay),this.overlay=null)},methods:{getOptionIndex:function(e,n){return this.virtualScrollerDisabled?e:n&&n(e).index},getOptionLabel:function(e){return this.optionLabel?T(e,this.optionLabel):e},getOptionValue:function(e){return this.optionValue?T(e,this.optionValue):e},getOptionRenderKey:function(e,n){return this.dataKey?T(e,this.dataKey):this.getOptionLabel(e)+"_".concat(n)},getHeaderCheckboxPTOptions:function(e){return this.ptm(e,{context:{selected:this.allSelected}})},getCheckboxPTOptions:function(e,n,l,o){return this.ptm(o,{context:{selected:this.isSelected(e),focused:this.focusedOptionIndex===this.getOptionIndex(l,n),disabled:this.isOptionDisabled(e)}})},isOptionDisabled:function(e){return this.maxSelectionLimitReached&&!this.isSelected(e)?!0:this.optionDisabled?T(e,this.optionDisabled):!1},isOptionGroup:function(e){return this.optionGroupLabel&&e.optionGroup&&e.group},getOptionGroupLabel:function(e){return T(e,this.optionGroupLabel)},getOptionGroupChildren:function(e){return T(e,this.optionGroupChildren)},getAriaPosInset:function(e){var n=this;return(this.optionGroupLabel?e-this.visibleOptions.slice(0,e).filter(function(l){return n.isOptionGroup(l)}).length:e)+1},show:function(e){this.$emit("before-show"),this.overlayVisible=!0,this.focusedOptionIndex=this.focusedOptionIndex!==-1?this.focusedOptionIndex:this.autoOptionFocus?this.findFirstFocusedOptionIndex():this.findSelectedOptionIndex(),e&&F(this.$refs.focusInput)},hide:function(e){var n=this,l=function(){n.$emit("before-hide"),n.overlayVisible=!1,n.clicked=!1,n.focusedOptionIndex=-1,n.searchValue="",n.resetFilterOnHide&&(n.filterValue=null),e&&F(n.$refs.focusInput)};setTimeout(function(){l()},0)},onFocus:function(e){this.disabled||(this.focused=!0,this.overlayVisible&&(this.focusedOptionIndex=this.focusedOptionIndex!==-1?this.focusedOptionIndex:this.autoOptionFocus?this.findFirstFocusedOptionIndex():this.findSelectedOptionIndex(),this.scrollInView(this.focusedOptionIndex)),this.$emit("focus",e))},onBlur:function(e){var n,l;this.clicked=!1,this.focused=!1,this.focusedOptionIndex=-1,this.searchValue="",this.$emit("blur",e),(n=(l=this.formField).onBlur)===null||n===void 0||n.call(l)},onKeyDown:function(e){var n=this;if(this.disabled){e.preventDefault();return}var l=e.metaKey||e.ctrlKey;switch(e.code){case"ArrowDown":this.onArrowDownKey(e);break;case"ArrowUp":this.onArrowUpKey(e);break;case"Home":this.onHomeKey(e);break;case"End":this.onEndKey(e);break;case"PageDown":this.onPageDownKey(e);break;case"PageUp":this.onPageUpKey(e);break;case"Enter":case"NumpadEnter":case"Space":this.onEnterKey(e);break;case"Escape":this.onEscapeKey(e);break;case"Tab":this.onTabKey(e);break;case"ShiftLeft":case"ShiftRight":this.onShiftKey(e);break;default:if(e.code==="KeyA"&&l){var o=this.visibleOptions.filter(function(i){return n.isValidOption(i)}).map(function(i){return n.getOptionValue(i)});this.updateModel(e,o),e.preventDefault();break}!l&&ae(e.key)&&(!this.overlayVisible&&this.show(),this.searchOptions(e),e.preventDefault());break}this.clicked=!1},onContainerClick:function(e){this.disabled||this.loading||e.target.tagName==="INPUT"||e.target.getAttribute("data-pc-section")==="clearicon"||e.target.closest('[data-pc-section="clearicon"]')||((!this.overlay||!this.overlay.contains(e.target))&&(this.overlayVisible?this.hide(!0):this.show(!0)),this.clicked=!0)},onClearClick:function(e){this.updateModel(e,null),this.resetFilterOnClear&&(this.filterValue=null)},onFirstHiddenFocus:function(e){var n=e.relatedTarget===this.$refs.focusInput?ce(this.overlay,':not([data-p-hidden-focusable="true"])'):this.$refs.focusInput;F(n)},onLastHiddenFocus:function(e){var n=e.relatedTarget===this.$refs.focusInput?ue(this.overlay,':not([data-p-hidden-focusable="true"])'):this.$refs.focusInput;F(n)},onOptionSelect:function(e,n){var l=this,o=arguments.length>2&&arguments[2]!==void 0?arguments[2]:-1,i=arguments.length>3&&arguments[3]!==void 0?arguments[3]:!1;if(!(this.disabled||this.isOptionDisabled(n))){var d=this.isSelected(n),m=null;d?m=this.d_value.filter(function(g){return!z(g,l.getOptionValue(n),l.equalityKey)}):m=[].concat(Z(this.d_value||[]),[this.getOptionValue(n)]),this.updateModel(e,m),o!==-1&&(this.focusedOptionIndex=o),i&&F(this.$refs.focusInput)}},onOptionMouseMove:function(e,n){this.focusOnHover&&this.changeFocusedOptionIndex(e,n)},onOptionSelectRange:function(e){var n=this,l=arguments.length>1&&arguments[1]!==void 0?arguments[1]:-1,o=arguments.length>2&&arguments[2]!==void 0?arguments[2]:-1;if(l===-1&&(l=this.findNearestSelectedOptionIndex(o,!0)),o===-1&&(o=this.findNearestSelectedOptionIndex(l)),l!==-1&&o!==-1){var i=Math.min(l,o),d=Math.max(l,o),m=this.visibleOptions.slice(i,d+1).filter(function(g){return n.isValidOption(g)}).map(function(g){return n.getOptionValue(g)});this.updateModel(e,m)}},onFilterChange:function(e){var n=e.target.value;this.filterValue=n,this.focusedOptionIndex=-1,this.$emit("filter",{originalEvent:e,value:n}),!this.virtualScrollerDisabled&&this.virtualScroller.scrollToIndex(0)},onFilterKeyDown:function(e){switch(e.code){case"ArrowDown":this.onArrowDownKey(e);break;case"ArrowUp":this.onArrowUpKey(e,!0);break;case"ArrowLeft":case"ArrowRight":this.onArrowLeftKey(e,!0);break;case"Home":this.onHomeKey(e,!0);break;case"End":this.onEndKey(e,!0);break;case"Enter":case"NumpadEnter":this.onEnterKey(e);break;case"Escape":this.onEscapeKey(e);break;case"Tab":this.onTabKey(e,!0);break}},onFilterBlur:function(){this.focusedOptionIndex=-1},onFilterUpdated:function(){this.overlayVisible&&this.alignOverlay()},onOverlayClick:function(e){He.emit("overlay-click",{originalEvent:e,target:this.$el})},onOverlayKeyDown:function(e){switch(e.code){case"Escape":this.onEscapeKey(e);break}},onArrowDownKey:function(e){if(!this.overlayVisible)this.show();else{var n=this.focusedOptionIndex!==-1?this.findNextOptionIndex(this.focusedOptionIndex):this.clicked?this.findFirstOptionIndex():this.findFirstFocusedOptionIndex();e.shiftKey&&this.onOptionSelectRange(e,this.startRangeIndex,n),this.changeFocusedOptionIndex(e,n)}e.preventDefault()},onArrowUpKey:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1;if(e.altKey&&!n)this.focusedOptionIndex!==-1&&this.onOptionSelect(e,this.visibleOptions[this.focusedOptionIndex]),this.overlayVisible&&this.hide(),e.preventDefault();else{var l=this.focusedOptionIndex!==-1?this.findPrevOptionIndex(this.focusedOptionIndex):this.clicked?this.findLastOptionIndex():this.findLastFocusedOptionIndex();e.shiftKey&&this.onOptionSelectRange(e,l,this.startRangeIndex),this.changeFocusedOptionIndex(e,l),!this.overlayVisible&&this.show(),e.preventDefault()}},onArrowLeftKey:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1;n&&(this.focusedOptionIndex=-1)},onHomeKey:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1;if(n){var l=e.currentTarget;e.shiftKey?l.setSelectionRange(0,e.target.selectionStart):(l.setSelectionRange(0,0),this.focusedOptionIndex=-1)}else{var o=e.metaKey||e.ctrlKey,i=this.findFirstOptionIndex();e.shiftKey&&o&&this.onOptionSelectRange(e,i,this.startRangeIndex),this.changeFocusedOptionIndex(e,i),!this.overlayVisible&&this.show()}e.preventDefault()},onEndKey:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1;if(n){var l=e.currentTarget;if(e.shiftKey)l.setSelectionRange(e.target.selectionStart,l.value.length);else{var o=l.value.length;l.setSelectionRange(o,o),this.focusedOptionIndex=-1}}else{var i=e.metaKey||e.ctrlKey,d=this.findLastOptionIndex();e.shiftKey&&i&&this.onOptionSelectRange(e,this.startRangeIndex,d),this.changeFocusedOptionIndex(e,d),!this.overlayVisible&&this.show()}e.preventDefault()},onPageUpKey:function(e){this.scrollInView(0),e.preventDefault()},onPageDownKey:function(e){this.scrollInView(this.visibleOptions.length-1),e.preventDefault()},onEnterKey:function(e){this.overlayVisible?this.focusedOptionIndex!==-1&&(e.shiftKey?this.onOptionSelectRange(e,this.focusedOptionIndex):this.onOptionSelect(e,this.visibleOptions[this.focusedOptionIndex])):(this.focusedOptionIndex=-1,this.onArrowDownKey(e)),e.preventDefault()},onEscapeKey:function(e){this.overlayVisible&&this.hide(!0),e.preventDefault()},onTabKey:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1;n||(this.overlayVisible&&this.hasFocusableElements()?(F(e.shiftKey?this.$refs.lastHiddenFocusableElementOnOverlay:this.$refs.firstHiddenFocusableElementOnOverlay),e.preventDefault()):(this.focusedOptionIndex!==-1&&this.onOptionSelect(e,this.visibleOptions[this.focusedOptionIndex]),this.overlayVisible&&this.hide(this.filter)))},onShiftKey:function(){this.startRangeIndex=this.focusedOptionIndex},onOverlayEnter:function(e){U.set("overlay",e,this.$primevue.config.zIndex.overlay),de(e,{position:"absolute",top:"0",left:"0"}),this.alignOverlay(),this.scrollInView(),this.autoFilterFocus&&F(this.$refs.filterInput.$el)},onOverlayAfterEnter:function(){this.bindOutsideClickListener(),this.bindScrollListener(),this.bindResizeListener(),this.$emit("show")},onOverlayLeave:function(){this.unbindOutsideClickListener(),this.unbindScrollListener(),this.unbindResizeListener(),this.$emit("hide"),this.overlay=null},onOverlayAfterLeave:function(e){U.clear(e)},alignOverlay:function(){this.appendTo==="self"?pe(this.overlay,this.$el):(this.overlay.style.minWidth=he(this.$el)+"px",fe(this.overlay,this.$el))},bindOutsideClickListener:function(){var e=this;this.outsideClickListener||(this.outsideClickListener=function(n){e.overlayVisible&&e.isOutsideClicked(n)&&e.hide()},document.addEventListener("click",this.outsideClickListener))},unbindOutsideClickListener:function(){this.outsideClickListener&&(document.removeEventListener("click",this.outsideClickListener),this.outsideClickListener=null)},bindScrollListener:function(){var e=this;this.scrollHandler||(this.scrollHandler=new me(this.$refs.container,function(){e.overlayVisible&&e.hide()})),this.scrollHandler.bindScrollListener()},unbindScrollListener:function(){this.scrollHandler&&this.scrollHandler.unbindScrollListener()},bindResizeListener:function(){var e=this;this.resizeListener||(this.resizeListener=function(){e.overlayVisible&&!ge()&&e.hide()},window.addEventListener("resize",this.resizeListener))},unbindResizeListener:function(){this.resizeListener&&(window.removeEventListener("resize",this.resizeListener),this.resizeListener=null)},isOutsideClicked:function(e){return!(this.$el.isSameNode(e.target)||this.$el.contains(e.target)||this.overlay&&this.overlay.contains(e.target))},getLabelByValue:function(e){var n=this,l=this.optionGroupLabel?this.flatOptions(this.options):this.options||[],o=l.find(function(i){return!n.isOptionGroup(i)&&z(n.getOptionValue(i),e,n.equalityKey)});return o?this.getOptionLabel(o):null},getSelectedItemsLabel:function(){var e=/{(.*?)}/,n=this.selectedItemsLabel||this.$primevue.config.locale.selectionMessage;return e.test(n)?n.replace(n.match(e)[0],this.d_value.length+""):n},onToggleAll:function(e){var n=this;if(this.selectAll!==null)this.$emit("selectall-change",{originalEvent:e,checked:!this.allSelected});else{var l=this.allSelected?[]:this.visibleOptions.filter(function(o){return n.isValidOption(o)}).map(function(o){return n.getOptionValue(o)});this.updateModel(e,l)}},removeOption:function(e,n){var l=this;e.stopPropagation();var o=this.d_value.filter(function(i){return!z(i,n,l.equalityKey)});this.updateModel(e,o)},clearFilter:function(){this.filterValue=null},hasFocusableElements:function(){return be(this.overlay,':not([data-p-hidden-focusable="true"])').length>0},isOptionMatched:function(e){var n;return this.isValidOption(e)&&typeof this.getOptionLabel(e)=="string"&&((n=this.getOptionLabel(e))===null||n===void 0?void 0:n.toLocaleLowerCase(this.filterLocale).startsWith(this.searchValue.toLocaleLowerCase(this.filterLocale)))},isValidOption:function(e){return x(e)&&!(this.isOptionDisabled(e)||this.isOptionGroup(e))},isValidSelectedOption:function(e){return this.isValidOption(e)&&this.isSelected(e)},isEquals:function(e,n){return z(e,n,this.equalityKey)},isSelected:function(e){var n=this,l=this.getOptionValue(e);return(this.d_value||[]).some(function(o){return n.isEquals(o,l)})},findFirstOptionIndex:function(){var e=this;return this.visibleOptions.findIndex(function(n){return e.isValidOption(n)})},findLastOptionIndex:function(){var e=this;return H(this.visibleOptions,function(n){return e.isValidOption(n)})},findNextOptionIndex:function(e){var n=this,l=e<this.visibleOptions.length-1?this.visibleOptions.slice(e+1).findIndex(function(o){return n.isValidOption(o)}):-1;return l>-1?l+e+1:e},findPrevOptionIndex:function(e){var n=this,l=e>0?H(this.visibleOptions.slice(0,e),function(o){return n.isValidOption(o)}):-1;return l>-1?l:e},findSelectedOptionIndex:function(){var e=this;if(this.$filled){for(var n=function(){var d=e.d_value[o],m=e.visibleOptions.findIndex(function(g){return e.isValidSelectedOption(g)&&e.isEquals(d,e.getOptionValue(g))});if(m>-1)return{v:m}},l,o=this.d_value.length-1;o>=0;o--)if(l=n(),l)return l.v}return-1},findFirstSelectedOptionIndex:function(){var e=this;return this.$filled?this.visibleOptions.findIndex(function(n){return e.isValidSelectedOption(n)}):-1},findLastSelectedOptionIndex:function(){var e=this;return this.$filled?H(this.visibleOptions,function(n){return e.isValidSelectedOption(n)}):-1},findNextSelectedOptionIndex:function(e){var n=this,l=this.$filled&&e<this.visibleOptions.length-1?this.visibleOptions.slice(e+1).findIndex(function(o){return n.isValidSelectedOption(o)}):-1;return l>-1?l+e+1:-1},findPrevSelectedOptionIndex:function(e){var n=this,l=this.$filled&&e>0?H(this.visibleOptions.slice(0,e),function(o){return n.isValidSelectedOption(o)}):-1;return l>-1?l:-1},findNearestSelectedOptionIndex:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1,l=-1;return this.$filled&&(n?(l=this.findPrevSelectedOptionIndex(e),l=l===-1?this.findNextSelectedOptionIndex(e):l):(l=this.findNextSelectedOptionIndex(e),l=l===-1?this.findPrevSelectedOptionIndex(e):l)),l>-1?l:e},findFirstFocusedOptionIndex:function(){var e=this.findSelectedOptionIndex();return e<0?this.findFirstOptionIndex():e},findLastFocusedOptionIndex:function(){var e=this.findSelectedOptionIndex();return e<0?this.findLastOptionIndex():e},searchOptions:function(e){var n=this;this.searchValue=(this.searchValue||"")+e.key;var l=-1;x(this.searchValue)&&(this.focusedOptionIndex!==-1?(l=this.visibleOptions.slice(this.focusedOptionIndex).findIndex(function(o){return n.isOptionMatched(o)}),l=l===-1?this.visibleOptions.slice(0,this.focusedOptionIndex).findIndex(function(o){return n.isOptionMatched(o)}):l+this.focusedOptionIndex):l=this.visibleOptions.findIndex(function(o){return n.isOptionMatched(o)}),l===-1&&this.focusedOptionIndex===-1&&(l=this.findFirstFocusedOptionIndex()),l!==-1&&this.changeFocusedOptionIndex(e,l)),this.searchTimeout&&clearTimeout(this.searchTimeout),this.searchTimeout=setTimeout(function(){n.searchValue="",n.searchTimeout=null},500)},changeFocusedOptionIndex:function(e,n){this.focusedOptionIndex!==n&&(this.focusedOptionIndex=n,this.scrollInView(),this.selectOnFocus&&this.onOptionSelect(e,this.visibleOptions[n]))},scrollInView:function(){var e=this,n=arguments.length>0&&arguments[0]!==void 0?arguments[0]:-1;this.$nextTick(function(){var l=n!==-1?"".concat(e.id,"_").concat(n):e.focusedOptionId,o=ye(e.list,'li[id="'.concat(l,'"]'));o?o.scrollIntoView&&o.scrollIntoView({block:"nearest",inline:"nearest"}):e.virtualScrollerDisabled||e.virtualScroller&&e.virtualScroller.scrollToIndex(n!==-1?n:e.focusedOptionIndex)})},autoUpdateModel:function(){if(this.selectOnFocus&&this.autoOptionFocus&&!this.$filled){this.focusedOptionIndex=this.findFirstFocusedOptionIndex();var e=this.getOptionValue(this.visibleOptions[this.focusedOptionIndex]);this.updateModel(null,[e])}},updateModel:function(e,n){this.writeValue(n,e),this.$emit("change",{originalEvent:e,value:n})},flatOptions:function(e){var n=this;return(e||[]).reduce(function(l,o,i){l.push({optionGroup:o,group:!0,index:i});var d=n.getOptionGroupChildren(o);return d&&d.forEach(function(m){return l.push(m)}),l},[])},overlayRef:function(e){this.overlay=e},listRef:function(e,n){this.list=e,n&&n(e)},virtualScrollerRef:function(e){this.virtualScroller=e}},computed:{visibleOptions:function(){var e=this,n=this.optionGroupLabel?this.flatOptions(this.options):this.options||[];if(this.filterValue){var l=ve.filter(n,this.searchFields,this.filterValue,this.filterMatchMode,this.filterLocale);if(this.optionGroupLabel){var o=this.options||[],i=[];return o.forEach(function(d){var m=e.getOptionGroupChildren(d),g=m.filter(function(B){return l.includes(B)});g.length>0&&i.push(W(W({},d),{},Y({},typeof e.optionGroupChildren=="string"?e.optionGroupChildren:"items",Z(g))))}),this.flatOptions(i)}return l}return n},label:function(){var e;if(this.d_value&&this.d_value.length){if(x(this.maxSelectedLabels)&&this.d_value.length>this.maxSelectedLabels)return this.getSelectedItemsLabel();e="";for(var n=0;n<this.d_value.length;n++)n!==0&&(e+=", "),e+=this.getLabelByValue(this.d_value[n])}else e=this.placeholder;return e},chipSelectedItems:function(){return x(this.maxSelectedLabels)&&this.d_value&&this.d_value.length>this.maxSelectedLabels},allSelected:function(){var e=this;return this.selectAll!==null?this.selectAll:x(this.visibleOptions)&&this.visibleOptions.every(function(n){return e.isOptionGroup(n)||e.isOptionDisabled(n)||e.isSelected(n)})},hasSelectedOption:function(){return this.$filled},equalityKey:function(){return this.optionValue?null:this.dataKey},searchFields:function(){return this.filterFields||[this.optionLabel]},maxSelectionLimitReached:function(){return this.selectionLimit&&this.d_value&&this.d_value.length===this.selectionLimit},filterResultMessageText:function(){return x(this.visibleOptions)?this.filterMessageText.replaceAll("{0}",this.visibleOptions.length):this.emptyFilterMessageText},filterMessageText:function(){return this.filterMessage||this.$primevue.config.locale.searchMessage||""},emptyFilterMessageText:function(){return this.emptyFilterMessage||this.$primevue.config.locale.emptySearchMessage||this.$primevue.config.locale.emptyFilterMessage||""},emptyMessageText:function(){return this.emptyMessage||this.$primevue.config.locale.emptyMessage||""},selectionMessageText:function(){return this.selectionMessage||this.$primevue.config.locale.selectionMessage||""},emptySelectionMessageText:function(){return this.emptySelectionMessage||this.$primevue.config.locale.emptySelectionMessage||""},selectedMessageText:function(){return this.$filled?this.selectionMessageText.replaceAll("{0}",this.d_value.length):this.emptySelectionMessageText},focusedOptionId:function(){return this.focusedOptionIndex!==-1?"".concat(this.id,"_").concat(this.focusedOptionIndex):null},ariaSetSize:function(){var e=this;return this.visibleOptions.filter(function(n){return!e.isOptionGroup(n)}).length},toggleAllAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria[this.allSelected?"selectAll":"unselectAll"]:void 0},listAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria.listLabel:void 0},virtualScrollerDisabled:function(){return!this.virtualScrollerOptions},hasFluid:function(){return Oe(this.fluid)?!!this.$pcFluid:this.fluid},isClearIconVisible:function(){return this.showClear&&this.d_value!=null&&x(this.options)}},directives:{ripple:Ie},components:{InputText:Re,Checkbox:Pe,VirtualScroller:Te,Portal:Se,Chip:X,IconField:Me,InputIcon:Ae,TimesIcon:ke,SearchIcon:Ee,ChevronDownIcon:Ke,SpinnerIcon:De,CheckIcon:we}};function D(t){"@babel/helpers - typeof";return D=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},D(t)}function J(t,e,n){return(e=ot(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function ot(t){var e=st(t,"string");return D(e)=="symbol"?e:e+""}function st(t,e){if(D(t)!="object"||!t)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var l=n.call(t,e||"default");if(D(l)!="object")return l;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}var rt=["id","disabled","placeholder","tabindex","aria-label","aria-labelledby","aria-expanded","aria-controls","aria-activedescendant","aria-invalid"],at={key:0},ct=["id","aria-label"],ut=["id"],dt=["id","aria-label","aria-selected","aria-disabled","aria-setsize","aria-posinset","onClick","onMousemove","data-p-selected","data-p-focused","data-p-disabled"];function pt(t,e,n,l,o,i){var d=I("Chip"),m=I("SpinnerIcon"),g=I("Checkbox"),B=I("InputText"),_=I("SearchIcon"),ee=I("InputIcon"),te=I("IconField"),ne=I("VirtualScroller"),ie=I("Portal"),le=Le("ripple");return r(),a("div",s({ref:"container",class:t.cx("root"),style:t.sx("root"),onClick:e[7]||(e[7]=function(){return i.onContainerClick&&i.onContainerClick.apply(i,arguments)})},t.ptmi("root")),[v("div",s({class:"p-hidden-accessible"},t.ptm("hiddenInputContainer"),{"data-p-hidden-accessible":!0}),[v("input",s({ref:"focusInput",id:t.inputId,type:"text",readonly:"",disabled:t.disabled,placeholder:t.placeholder,tabindex:t.disabled?-1:t.tabindex,role:"combobox","aria-label":t.ariaLabel,"aria-labelledby":t.ariaLabelledby,"aria-haspopup":"listbox","aria-expanded":o.overlayVisible,"aria-controls":o.id+"_list","aria-activedescendant":o.focused?i.focusedOptionId:void 0,"aria-invalid":t.invalid||void 0,onFocus:e[0]||(e[0]=function(){return i.onFocus&&i.onFocus.apply(i,arguments)}),onBlur:e[1]||(e[1]=function(){return i.onBlur&&i.onBlur.apply(i,arguments)}),onKeydown:e[2]||(e[2]=function(){return i.onKeyDown&&i.onKeyDown.apply(i,arguments)})},t.ptm("hiddenInput")),null,16,rt)],16),v("div",s({class:t.cx("labelContainer")},t.ptm("labelContainer")),[v("div",s({class:t.cx("label")},t.ptm("label")),[p(t.$slots,"value",{value:t.d_value,placeholder:t.placeholder},function(){return[t.display==="comma"?(r(),a(M,{key:0},[A(O(i.label||"empty"),1)],64)):t.display==="chip"?(r(),a(M,{key:1},[i.chipSelectedItems?(r(),a("span",at,O(i.label),1)):(r(!0),a(M,{key:1},$(t.d_value,function(c){return r(),a("span",s({key:i.getLabelByValue(c),class:t.cx("chipItem"),ref_for:!0},t.ptm("chipItem")),[p(t.$slots,"chip",{value:c,removeCallback:function(L){return i.removeOption(L,c)}},function(){return[V(d,{class:k(t.cx("pcChip")),label:i.getLabelByValue(c),removeIcon:t.chipIcon||t.removeTokenIcon,removable:"",unstyled:t.unstyled,onRemove:function(L){return i.removeOption(L,c)},pt:t.ptm("pcChip")},{removeicon:S(function(){return[p(t.$slots,t.$slots.chipicon?"chipicon":"removetokenicon",{class:k(t.cx("chipIcon")),item:c,removeCallback:function(L){return i.removeOption(L,c)}})]}),_:2},1032,["class","label","removeIcon","unstyled","onRemove","pt"])]})],16)}),128)),!t.d_value||t.d_value.length===0?(r(),a(M,{key:2},[A(O(t.placeholder||"empty"),1)],64)):h("",!0)],64)):h("",!0)]})],16)],16),i.isClearIconVisible?p(t.$slots,"clearicon",{key:0,class:k(t.cx("clearIcon")),clearCallback:i.onClearClick},function(){return[(r(),y(w(t.clearIcon?"i":"TimesIcon"),s({ref:"clearIcon",class:[t.cx("clearIcon"),t.clearIcon],onClick:i.onClearClick},t.ptm("clearIcon"),{"data-pc-section":"clearicon"}),null,16,["class","onClick"]))]}):h("",!0),v("div",s({class:t.cx("dropdown")},t.ptm("dropdown")),[t.loading?p(t.$slots,"loadingicon",{key:0,class:k(t.cx("loadingIcon"))},function(){return[t.loadingIcon?(r(),a("span",s({key:0,class:[t.cx("loadingIcon"),"pi-spin",t.loadingIcon],"aria-hidden":"true"},t.ptm("loadingIcon")),null,16)):(r(),y(m,s({key:1,class:t.cx("loadingIcon"),spin:"","aria-hidden":"true"},t.ptm("loadingIcon")),null,16,["class"]))]}):p(t.$slots,"dropdownicon",{key:1,class:k(t.cx("dropdownIcon"))},function(){return[(r(),y(w(t.dropdownIcon?"span":"ChevronDownIcon"),s({class:[t.cx("dropdownIcon"),t.dropdownIcon],"aria-hidden":"true"},t.ptm("dropdownIcon")),null,16,["class"]))]})],16),V(ie,{appendTo:t.appendTo},{default:S(function(){return[V(Ce,s({name:"p-connected-overlay",onEnter:i.onOverlayEnter,onAfterEnter:i.onOverlayAfterEnter,onLeave:i.onOverlayLeave,onAfterLeave:i.onOverlayAfterLeave},t.ptm("transition")),{default:S(function(){return[o.overlayVisible?(r(),a("div",s({key:0,ref:i.overlayRef,style:[t.panelStyle,t.overlayStyle],class:[t.cx("overlay"),t.panelClass,t.overlayClass],onClick:e[5]||(e[5]=function(){return i.onOverlayClick&&i.onOverlayClick.apply(i,arguments)}),onKeydown:e[6]||(e[6]=function(){return i.onOverlayKeyDown&&i.onOverlayKeyDown.apply(i,arguments)})},t.ptm("overlay")),[v("span",s({ref:"firstHiddenFocusableElementOnOverlay",role:"presentation","aria-hidden":"true",class:"p-hidden-accessible p-hidden-focusable",tabindex:0,onFocus:e[3]||(e[3]=function(){return i.onFirstHiddenFocus&&i.onFirstHiddenFocus.apply(i,arguments)})},t.ptm("hiddenFirstFocusableEl"),{"data-p-hidden-accessible":!0,"data-p-hidden-focusable":!0}),null,16),p(t.$slots,"header",{value:t.d_value,options:i.visibleOptions}),t.showToggleAll&&t.selectionLimit==null||t.filter?(r(),a("div",s({key:0,class:t.cx("header")},t.ptm("header")),[t.showToggleAll&&t.selectionLimit==null?(r(),y(g,{key:0,modelValue:i.allSelected,binary:!0,disabled:t.disabled,variant:t.variant,"aria-label":i.toggleAllAriaLabel,onChange:i.onToggleAll,unstyled:t.unstyled,pt:i.getHeaderCheckboxPTOptions("pcHeaderCheckbox")},{icon:S(function(c){return[t.$slots.headercheckboxicon?(r(),y(w(t.$slots.headercheckboxicon),{key:0,checked:c.checked,class:k(c.class)},null,8,["checked","class"])):c.checked?(r(),y(w(t.checkboxIcon?"span":"CheckIcon"),s({key:1,class:[c.class,J({},t.checkboxIcon,c.checked)]},i.getHeaderCheckboxPTOptions("pcHeaderCheckbox.icon")),null,16,["class"])):h("",!0)]}),_:1},8,["modelValue","disabled","variant","aria-label","onChange","unstyled","pt"])):h("",!0),t.filter?(r(),y(te,{key:1,class:k(t.cx("pcFilterContainer")),unstyled:t.unstyled,pt:t.ptm("pcFilterContainer")},{default:S(function(){return[V(B,{ref:"filterInput",value:o.filterValue,onVnodeMounted:i.onFilterUpdated,onVnodeUpdated:i.onFilterUpdated,class:k(t.cx("pcFilter")),placeholder:t.filterPlaceholder,disabled:t.disabled,variant:t.variant,unstyled:t.unstyled,role:"searchbox",autocomplete:"off","aria-owns":o.id+"_list","aria-activedescendant":i.focusedOptionId,onKeydown:i.onFilterKeyDown,onBlur:i.onFilterBlur,onInput:i.onFilterChange,pt:t.ptm("pcFilter")},null,8,["value","onVnodeMounted","onVnodeUpdated","class","placeholder","disabled","variant","unstyled","aria-owns","aria-activedescendant","onKeydown","onBlur","onInput","pt"]),V(ee,{unstyled:t.unstyled,pt:t.ptm("pcFilterIconContainer")},{default:S(function(){return[p(t.$slots,"filtericon",{},function(){return[t.filterIcon?(r(),a("span",s({key:0,class:t.filterIcon},t.ptm("filterIcon")),null,16)):(r(),y(_,Fe(s({key:1},t.ptm("filterIcon"))),null,16))]})]}),_:3},8,["unstyled","pt"])]}),_:3},8,["class","unstyled","pt"])):h("",!0),t.filter?(r(),a("span",s({key:2,role:"status","aria-live":"polite",class:"p-hidden-accessible"},t.ptm("hiddenFilterResult"),{"data-p-hidden-accessible":!0}),O(i.filterResultMessageText),17)):h("",!0)],16)):h("",!0),v("div",s({class:t.cx("listContainer"),style:{"max-height":i.virtualScrollerDisabled?t.scrollHeight:""}},t.ptm("listContainer")),[V(ne,s({ref:i.virtualScrollerRef},t.virtualScrollerOptions,{items:i.visibleOptions,style:{height:t.scrollHeight},tabindex:-1,disabled:i.virtualScrollerDisabled,pt:t.ptm("virtualScroller")}),xe({content:S(function(c){var K=c.styleClass,L=c.contentRef,P=c.items,b=c.getItemOptions,oe=c.contentStyle,R=c.itemSize;return[v("ul",s({ref:function(f){return i.listRef(f,L)},id:o.id+"_list",class:[t.cx("list"),K],style:oe,role:"listbox","aria-multiselectable":"true","aria-label":i.listAriaLabel},t.ptm("list")),[(r(!0),a(M,null,$(P,function(u,f){return r(),a(M,{key:i.getOptionRenderKey(u,i.getOptionIndex(f,b))},[i.isOptionGroup(u)?(r(),a("li",s({key:0,id:o.id+"_"+i.getOptionIndex(f,b),style:{height:R?R+"px":void 0},class:t.cx("optionGroup"),role:"option",ref_for:!0},t.ptm("optionGroup")),[p(t.$slots,"optiongroup",{option:u.optionGroup,index:i.getOptionIndex(f,b)},function(){return[A(O(i.getOptionGroupLabel(u.optionGroup)),1)]})],16,ut)):Ve((r(),a("li",s({key:1,id:o.id+"_"+i.getOptionIndex(f,b),style:{height:R?R+"px":void 0},class:t.cx("option",{option:u,index:f,getItemOptions:b}),role:"option","aria-label":i.getOptionLabel(u),"aria-selected":i.isSelected(u),"aria-disabled":i.isOptionDisabled(u),"aria-setsize":i.ariaSetSize,"aria-posinset":i.getAriaPosInset(i.getOptionIndex(f,b)),onClick:function(G){return i.onOptionSelect(G,u,i.getOptionIndex(f,b),!0)},onMousemove:function(G){return i.onOptionMouseMove(G,i.getOptionIndex(f,b))},ref_for:!0},i.getCheckboxPTOptions(u,b,f,"option"),{"data-p-selected":i.isSelected(u),"data-p-focused":o.focusedOptionIndex===i.getOptionIndex(f,b),"data-p-disabled":i.isOptionDisabled(u)}),[V(g,{defaultValue:i.isSelected(u),binary:!0,tabindex:-1,variant:t.variant,unstyled:t.unstyled,pt:i.getCheckboxPTOptions(u,b,f,"pcOptionCheckbox")},{icon:S(function(C){return[t.$slots.optioncheckboxicon||t.$slots.itemcheckboxicon?(r(),y(w(t.$slots.optioncheckboxicon||t.$slots.itemcheckboxicon),{key:0,checked:C.checked,class:k(C.class)},null,8,["checked","class"])):C.checked?(r(),y(w(t.checkboxIcon?"span":"CheckIcon"),s({key:1,class:[C.class,J({},t.checkboxIcon,C.checked)],ref_for:!0},i.getCheckboxPTOptions(u,b,f,"pcOptionCheckbox.icon")),null,16,["class"])):h("",!0)]}),_:2},1032,["defaultValue","variant","unstyled","pt"]),p(t.$slots,"option",{option:u,selected:i.isSelected(u),index:i.getOptionIndex(f,b)},function(){return[v("span",s({ref_for:!0},t.ptm("optionLabel")),O(i.getOptionLabel(u)),17)]})],16,dt)),[[le]])],64)}),128)),o.filterValue&&(!P||P&&P.length===0)?(r(),a("li",s({key:0,class:t.cx("emptyMessage"),role:"option"},t.ptm("emptyMessage")),[p(t.$slots,"emptyfilter",{},function(){return[A(O(i.emptyFilterMessageText),1)]})],16)):!t.options||t.options&&t.options.length===0?(r(),a("li",s({key:1,class:t.cx("emptyMessage"),role:"option"},t.ptm("emptyMessage")),[p(t.$slots,"empty",{},function(){return[A(O(i.emptyMessageText),1)]})],16)):h("",!0)],16,ct)]}),_:2},[t.$slots.loader?{name:"loader",fn:S(function(c){var K=c.options;return[p(t.$slots,"loader",{options:K})]}),key:"0"}:void 0]),1040,["items","style","disabled","pt"])],16),p(t.$slots,"footer",{value:t.d_value,options:i.visibleOptions}),!t.options||t.options&&t.options.length===0?(r(),a("span",s({key:1,role:"status","aria-live":"polite",class:"p-hidden-accessible"},t.ptm("hiddenEmptyMessage"),{"data-p-hidden-accessible":!0}),O(i.emptyMessageText),17)):h("",!0),v("span",s({role:"status","aria-live":"polite",class:"p-hidden-accessible"},t.ptm("hiddenSelectedMessage"),{"data-p-hidden-accessible":!0}),O(i.selectedMessageText),17),v("span",s({ref:"lastHiddenFocusableElementOnOverlay",role:"presentation","aria-hidden":"true",class:"p-hidden-accessible p-hidden-focusable",tabindex:0,onFocus:e[4]||(e[4]=function(){return i.onLastHiddenFocus&&i.onLastHiddenFocus.apply(i,arguments)})},t.ptm("hiddenLastFocusableEl"),{"data-p-hidden-accessible":!0,"data-p-hidden-focusable":!0}),null,16)],16)):h("",!0)]}),_:3},16,["onEnter","onAfterEnter","onLeave","onAfterLeave"])]}),_:3},8,["appendTo"])],16)}lt.render=pt;export{X as a,lt as s};
//# sourceMappingURL=index-CBYPfZAM.js.map
