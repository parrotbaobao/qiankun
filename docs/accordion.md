# 如何使用

在模块中引入：

```typescript
import { AccordionModule } from 'ng-devui/accordion';
```

在页面中使用：

```html
<d-accordion [data]="data"></d-accordion>
```

手风琴

### d-accordion 参数

| 参数 | 类型 | 默认 | 说明 | 动画演示 | 全局配置项|
| :----------------: | :----------------: | :---------------------------------------------------: | :--------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | -------------------------------------------------------------- |
|数据| `数组<任意> \|手风琴菜单类型` | --| 必选，数据源，可以使用默认的`AccordionMenuType` 进行云备份[基本使用](demo#basic-usage) |
|标题键 | `字符串` | '标题' | 任选，标题的属性名，item[titleKey]类型为`string`，为标题显示内容 | [改变按键值](demo#change-values) |
|加载键| `字符串` | '加载' | 任选，子菜单是否加载中的判断属性名，item[loadingKey]类型为`boolean` | [改变按键值](demo#change-values) |
|儿童钥匙 | `字符串` | '孩子们' | 任选，子菜单的属性名，item[childrenKey]类型为`Array<any>` | [改变按键值](demo#change-values) |
|禁用键 | `字符串` | '禁用'| 任选，是否禁用的属性名，item[disabledKey]类型为`boolean` | [改变按键值](demo#change-values) |
|活动密钥 | `字符串` | '活跃' | 任选，子菜单是否激活的属性名，item[activeKey]类型为`boolean` | [改变按键值](demo#change-values) |
|开钥匙| `字符串` | '打开' | 可选，菜单是否展开的属性名，item[openKey]类型为`boolean` | [改变按键值](demo#change-values) |
|限制一个打开 | `布尔值` |假 | 限制任选，限制一级菜单同时只能打开一个，默认不| [基本使用](demo#basic-usage) |
|菜单项模板 | `TemplateRef<任意>` | 内 | 任选，可展开菜单内容条模板，可用变量值见下| [使用模板](demo#using-templates) |
|项目模板 | `TemplateRef<任意>` | 内 | 任选，可点击菜单内容条模板，可获得变量值见下| [使用模板](demo#using-templates) |
|没有内容模板 | `TemplateRef<任意>` | 内 | 任选，没有内容的时候使用自定义模板，可用变量值见下 | [使用模板](demo#using-templates) |
|加载模板 | `TemplateRef<任意>` | 内 | 任选，加载中使用自定义模板，可用变量值见下 | [使用模板](demo#using-templates) |
|内部列表模板 | `TemplateRef<任意>` | 内 | 可选，子列表内容完全自定义，用做折叠面板，可用变量值见下 | [使用模板](demo#using-templates) |
|链接类型 | `'routerLink'\|'hrefLink'\|'dependOnLinkTypeKey'\|''` | '' | 任选，`'routerLink'`为路由场景；`'hrefLink'`为外部链接场景；`'dependOnLinkTypeKey'`为动态路由或外部链接场景；`''`为默认非链接类型（无法右键打开新标签页） | [内置路由和链接类型](demo#use-built-in-routing-and-link-types) |
|链接类型键 | `字符串` | '链接类型' | 任选，链接内容类型的键值，当linkType为`'dependOnLinkTypeKey'`时指定对象链接类型属性名，item[linkTypeKey]类型为`'routerLink'\|'hrefLink'\| string`，其中`'routerLink'`为路由链接，`'hrefLink'`为外部链接，其他为默认非链接类型 |
|链接键 | `字符串` | '链接' | 可选，链接内容的key，用于linkType为连接类型记非`''`时，链接的取值的属性值，item[linkKey]为路由地址或者超链接地址 |
|链接目标键 | `字符串` | '目标' | 任选，链接目标窗口的键，对于链接类型，item[linkTargetKey]为单个链接的目标窗口 |
|链接默认目标 | `字符串` | '\_self' | 可选，不设置 target 的时候 target 默认默认为`'_self'`，对于链接类型，取值接着于链接的目标属性 | [内置路由和链接类型](demo#use-built-in-routing-and-link-types) |
|自动打开活动菜单 | `布尔值` |假 | 任选，是否自动展开带有激活子项的菜单| [复合结构和自动展开](demo#compound-level-and-auto-expand) |
|手风琴类型 | `'正常'\|'嵌入'` | '正常' | 任选，菜单形式是普通（带阴影）或内嵌（不带阴影）| [基本使用](demo#basic-usage) |
|显示动画 | `布尔值` |真实| 任选，是否展示动画 | [内置路由和链接类型](demo#use-built-in-routing-and-link-types) | ✔ |
|显示无内容 | `布尔值` |真实| 任选，没有内容的时候是否显示没有数据 | | |

### d-手风琴事件

| 事件 | 类型 | 说明 | 动画演示 |
| :--------------: | :-----------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------: | ---------------------------- |
|菜单切换| `EventEmitter<`[`AccordionMenuToggleEvent`](#accordionmenutoggleevent)`>` | 任选，可展开菜单展开事件，返回对象里属性 item 为点击的对象数据，open 为 true 则要展开 false 则要关闭，parent 为父对象数据，event 为点击事件的原始事件 | [基本使用](demo#basic-usage) |
|项目点击| `EventEmitter<`[`AccordionItemClickEvent`](#accordionitemclickevent)`>` | 任选，可点击菜单点击事件，返回对象里属性 item 为点击的对象数据，preActive 对象为上一次展开的对象，parent 为父对象数据，event 为点击事件的婚姻事件 | [基本使用](demo#basic-usage) |
|活动项目更改 | `EventEmitter<任意>` | 任选，子项切换的时候会发出新激活的子项的数据 | [基本使用](demo#basic-usage) |

### AccordionMenuType 定义

```typescript
/* 基础数据类型 */
type AccordionMenuItemLinkType = 'routerLink' | 'hrefLink' | string;
导出接口 AccordionBase {
  标题：字符串；
  已禁用？：布尔值；
  [prop: string]: 任意类型;
}
interface IAccordionActiveable {
  激活？：布尔值；
}
interface IAccordionFoldable<T> {
  打开？：布尔值；
  加载中？：布尔值；
  children?: Array<T>;
}

interface IAccordionLinkable {
  链接？：字符串；
  目标？：布尔值；
  linkType?: AccordionMenuItemLinkType;
}
export interface AccordionBaseItem extends AccordionBase, IAccordionActiveable {}
export interface AccordionBaseMenu<T> extends AccordionBase, IAccordionFoldable<T> {}

export interface AccordionLinkableItem extends AccordionBase, IAccordionActiveable, IAccordionLinkable {}
export interface AccordionMenuItem extends AccordionBase, IAccordionActiveable, IAccordionFoldable<AccordionMenuItem>, IAccordionLinkable {}

export type AccordionMenuType = Array<AccordionMenuItem>;

/* 通用公共配置数据类型 */
接口 AccordionMenuKeyGroup {
  titleKey?: 字符串;
  activeKey?: 字符串;
  disabledKey?: 字符串;
  openKey?: 字符串;
  loadingKey?: 字符串;
  childrenKey?: 字符串;
  linkKey?: 字符串;
  linkTargetKey?: 字符串;
  linkTypeKey?: 字符串;
}

type AccordionTemplateRefArray = 'itemTemplate' | 'menuItemTemplate' | 'noContentTemplate' | 'loadingTemplate' | 'innerListTemplate';
类型 AccordionTemplateRefGroup = {
  [p 在 AccordionTemplateRefArray 中]: TemplateRef<any>;
};
interface AccordionConfigOptions {
  restrictOneOpen?: 布尔值;
  autoOpenActiveMenu?: 布尔值;
  showNoContent?: 布尔值；
  linkDefaultTarget?: 字符串;
  i18nText：任意；
  linkType: 'routerLink' | 'hrefLink' | 'dependOnLinkTypeKey' | '';
}
export interface AccordionOptions extends AccordionConfigOptions, AccordionMenuKeyGroup, AccordionTemplateRefGroup {}
```

## 手风琴菜单切换事件

``` typescript
导出类型 AccordionMenuToggleEvent = {
  项目：任意；
  打开：布尔值；
  父级：任意；
  事件：鼠标事件；
};
```

## 手风琴项目点击事件

``` typescript
导出类型 AccordionItemClickEvent = {
  项目：任意；
  prevActiveItem?: 任意;
  父级：任意；
  事件：鼠标事件；
};
```

### 模板可以用变量值

#### 变量使用方法

```html
<ng-template let-myitem="item">{{myitem}}</ng-template>
```

#### menuItemTemplate 可用变量值

| 变量 | 类型 | 变量意义说明 |
| :----------------: | :--------: | :-----------------------------------------------: |
|项目 | `任何` | 可展开类型菜单数据 |
|深度| `数字` | 表示构建结构 |
|家长 | `任何` | 父级菜单数据|
| ~~~标题键~~~ | `字符串` | `已经荒废`~~~组件的titleKey值~~~ |
| ~~~禁用键~~~ | `字符串` | `已经荒废`~~~组件的disabledKey值~~~ |
| ~~~开钥匙~~~ | `字符串` | `已经荒废`~~~组件的openKey值~~~ |
| ~~~菜单切换Fn~~~ | `功能` | `已经荒废`~~~参数为item，表示一级菜单被点击~~~ |

#### itemTemplate 可用变量值

| 变量 | 类型 | 变量意义说明 |
| :---------------: | :--------: | :-----------------------------------------------: |
|项目 | `任何` | 可点击类型菜单数据|
|深度| `数字` | 值表示构建结构 |
|家长 | `任何` | 父级菜单数据|
| ~~~标题键~~~ | `字符串` | `已经荒废`~~~组件的titleKey值~~~ |
| ~~~禁用键~~~ | `字符串` | `已经荒废`~~~组件的disabledKey值~~~ |
| ~~~活动键~~~ | `字符串` | `已经荒废`~~~组件的activeKey值~~~ |
| ~~~itemClickFn~~~ | `功能` | `已经荒废`~~~参数为item，表示二级菜单被点击~~~ |

#### noContentTemplate 可用变量值

| 变量 | 类型 | 变量意义说明 |
| :----: | :------: | :----------------: |
|项目 | `任何` | 父级菜单单个数据 |
|深度| `数字` | 值表示构建结构 |

####loadTemplate可用变量值

| 变量 | 类型 | 变量意义说明 |
| :--------------: | :------: | :------------------------: |
|项目 | `任何` | 父级菜单单个数据 |
|深度| `数字` | 值表示构建结构 |
| ~~~loadingKey~~~ | `字符串` | ~~~组件的loadingKey值~~~ |

#### insideListTemplate 可用变量值

| 变量 | 类型 | 变量意义说明 |
| :---------------: | :--------: | :----------------------------------------------------------------: |
|项目 | `任何` | 父级菜单单个数据 |
|深度| `数字` | 值表示构建结构 |
| ~~~标题键~~~ | `字符串` | `已经荒废`~~~组件的titleKey值~~~ |
| ~~~loadingKey~~~ | `字符串` | `已经荒废`~~~组件的loadingKey值~~~ |
| ~~~儿童钥匙~~~ | `字符串` | `已经荒废`~~~组件的children键值~~~ |
| ~~~禁用键~~~ | `字符串` | `已经荒废`~~~组件的disabledKey值~~~ |
| ~~~开钥匙~~~ | `字符串` | `已经荒废`~~~组件的openKey值~~~ |
| ~~~活动键~~~ | `字符串` | `已经荒废`~~~组件的activeKey值，用二级菜单~~~ |
|菜单切换Fn | `功能` | 参数应为item，表示菜单被展开，可选参数事件，原始事件|
|项目ClickFn | `功能` | 参数应为可点击菜单的项，表示菜单被点击，可选参数事件，原始事件 |
解释