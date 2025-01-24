import{B as g,ao as d,k as c,R as v,b as S,o as p,c as f,F as O,y as B,A as L,a1 as A,w,r as V,d as K,m as y,t as T}from"./index-D1uxBxpa.js";import{s as D}from"./index-8v2gNDOB.js";import{b as I}from"./index-B_dfm8Z3.js";var k=function(n){var t=n.dt;return`
.p-selectbutton {
    display: inline-flex;
    user-select: none;
    vertical-align: bottom;
    outline-color: transparent;
    border-radius: `.concat(t("selectbutton.border.radius"),`;
}

.p-selectbutton .p-togglebutton {
    border-radius: 0;
    border-width: 1px 1px 1px 0;
}

.p-selectbutton .p-togglebutton:focus-visible {
    position: relative;
    z-index: 1;
}

.p-selectbutton .p-togglebutton:first-child {
    border-inline-start-width: 1px;
    border-start-start-radius: `).concat(t("selectbutton.border.radius"),`;
    border-end-start-radius: `).concat(t("selectbutton.border.radius"),`;
}

.p-selectbutton .p-togglebutton:last-child {
    border-start-end-radius: `).concat(t("selectbutton.border.radius"),`;
    border-end-end-radius: `).concat(t("selectbutton.border.radius"),`;
}

.p-selectbutton.p-invalid {
    outline: 1px solid `).concat(t("selectbutton.invalid.border.color"),`;
    outline-offset: 0;
}
`)},C={root:function(n){var t=n.instance;return["p-selectbutton p-component",{"p-invalid":t.$invalid}]}},q=g.extend({name:"selectbutton",theme:k,classes:C}),E={name:"BaseSelectButton",extends:I,props:{options:Array,optionLabel:null,optionValue:null,optionDisabled:null,multiple:Boolean,allowEmpty:{type:Boolean,default:!0},dataKey:null,ariaLabelledby:{type:String,default:null},size:{type:String,default:null}},style:q,provide:function(){return{$pcSelectButton:this,$parentInstance:this}}};function $(e,n){var t=typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(!t){if(Array.isArray(e)||(t=h(e))||n){t&&(e=t);var i=0,s=function(){};return{s,n:function(){return i>=e.length?{done:!0}:{done:!1,value:e[i++]}},e:function(u){throw u},f:s}}throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}var a,o=!0,r=!1;return{s:function(){t=t.call(e)},n:function(){var u=t.next();return o=u.done,u},e:function(u){r=!0,a=u},f:function(){try{o||t.return==null||t.return()}finally{if(r)throw a}}}}function z(e){return x(e)||_(e)||h(e)||R()}function R(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function h(e,n){if(e){if(typeof e=="string")return b(e,n);var t={}.toString.call(e).slice(8,-1);return t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set"?Array.from(e):t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?b(e,n):void 0}}function _(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function x(e){if(Array.isArray(e))return b(e)}function b(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,i=Array(n);t<n;t++)i[t]=e[t];return i}var F={name:"SelectButton",extends:E,inheritAttrs:!1,emits:["change"],methods:{getOptionLabel:function(n){return this.optionLabel?d(n,this.optionLabel):n},getOptionValue:function(n){return this.optionValue?d(n,this.optionValue):n},getOptionRenderKey:function(n){return this.dataKey?d(n,this.dataKey):this.getOptionLabel(n)},isOptionDisabled:function(n){return this.optionDisabled?d(n,this.optionDisabled):!1},onOptionSelect:function(n,t,i){var s=this;if(!(this.disabled||this.isOptionDisabled(t))){var a=this.isSelected(t);if(!(a&&!this.allowEmpty)){var o=this.getOptionValue(t),r;this.multiple?a?r=this.d_value.filter(function(l){return!c(l,o,s.equalityKey)}):r=this.d_value?[].concat(z(this.d_value),[o]):[o]:r=a?null:o,this.writeValue(r,n),this.$emit("change",{event:n,value:r})}}},isSelected:function(n){var t=!1,i=this.getOptionValue(n);if(this.multiple){if(this.d_value){var s=$(this.d_value),a;try{for(s.s();!(a=s.n()).done;){var o=a.value;if(c(o,i,this.equalityKey)){t=!0;break}}}catch(r){s.e(r)}finally{s.f()}}}else t=c(this.d_value,i,this.equalityKey);return t}},computed:{equalityKey:function(){return this.optionValue?null:this.dataKey}},directives:{ripple:v},components:{ToggleButton:D}},j=["aria-labelledby"];function H(e,n,t,i,s,a){var o=S("ToggleButton");return p(),f("div",y({class:e.cx("root"),role:"group","aria-labelledby":e.ariaLabelledby},e.ptmi("root")),[(p(!0),f(O,null,B(e.options,function(r,l){return p(),L(o,{key:a.getOptionRenderKey(r),modelValue:a.isSelected(r),onLabel:a.getOptionLabel(r),offLabel:a.getOptionLabel(r),disabled:e.disabled||a.isOptionDisabled(r),unstyled:e.unstyled,size:e.size,readonly:!e.allowEmpty&&a.isSelected(r),onChange:function(m){return a.onOptionSelect(m,r,l)},pt:e.ptm("pcToggleButton")},A({_:2},[e.$slots.option?{name:"default",fn:w(function(){return[V(e.$slots,"option",{option:r,index:l},function(){return[K("span",y({ref_for:!0},e.ptm("pcToggleButton").label),T(a.getOptionLabel(r)),17)]})]}),key:"0"}:void 0]),1032,["modelValue","onLabel","offLabel","disabled","unstyled","size","readonly","onChange","pt"])}),128))],16,j)}F.render=H;export{F as s};
//# sourceMappingURL=index-D_iDgPrv.js.map
