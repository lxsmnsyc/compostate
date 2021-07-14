import {
  Attributes,
  VComponent,
  VNode,
} from './src/types';
import {
  DetailedHTMLProps,
  AnchorHTMLAttributes,
  HTMLAttributes,
  AreaHTMLAttributes,
  AudioHTMLAttributes,
  BaseHTMLAttributes,
  BlockquoteHTMLAttributes,
  ButtonHTMLAttributes,
  CanvasHTMLAttributes,
  ColHTMLAttributes,
  ColgroupHTMLAttributes,
  DataHTMLAttributes,
  DelHTMLAttributes,
  DetailsHTMLAttributes,
  DialogHTMLAttributes,
  EmbedHTMLAttributes,
  FieldsetHTMLAttributes,
  FormHTMLAttributes,
  HtmlHTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  InsHTMLAttributes,
  KeygenHTMLAttributes,
  LabelHTMLAttributes,
  LiHTMLAttributes,
  LinkHTMLAttributes,
  MapHTMLAttributes,
  MenuHTMLAttributes,
  MetaHTMLAttributes,
  MeterHTMLAttributes,
  ObjectHTMLAttributes,
  OlHTMLAttributes,
  OptgroupHTMLAttributes,
  OptionHTMLAttributes,
  OutputHTMLAttributes,
  ParamHTMLAttributes,
  ProgressHTMLAttributes,
  QuoteHTMLAttributes,
  SlotHTMLAttributes,
  ScriptHTMLAttributes,
  SelectHTMLAttributes,
  SourceHTMLAttributes,
  StyleHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  TextareaHTMLAttributes,
  ThHTMLAttributes,
  TimeHTMLAttributes,
  TrackHTMLAttributes,
  VideoHTMLAttributes,
  // WebViewHTMLAttributes,
} from './src/types/html';
import { SVGProps } from './src/types/svg';

declare global {
  namespace Compostate {
    namespace JSX {
      interface Element extends VNode {
    
      }
    
      interface ElementClass extends VComponent<any> {
        //
      }
    
      interface ElementAttributesProperty {
        props: any;
      }
    
      interface ElementChildrenAttribute {
        children: any;
      }
    
      interface IntrinsicAttributes extends Attributes {}
    
      interface IntrinsicClassAttributes extends Attributes {}
    
      interface IntrinsicElements {
        a: DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
        abbr: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        address: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        area: DetailedHTMLProps<AreaHTMLAttributes<HTMLAreaElement>, HTMLAreaElement>;
        article: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        aside: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        audio: DetailedHTMLProps<AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement>;
        b: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        base: DetailedHTMLProps<BaseHTMLAttributes<HTMLBaseElement>, HTMLBaseElement>;
        bdi: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        bdo: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        big: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        blockquote: DetailedHTMLProps<BlockquoteHTMLAttributes<HTMLElement>, HTMLElement>;
        body: DetailedHTMLProps<HTMLAttributes<HTMLBodyElement>, HTMLBodyElement>;
        br: DetailedHTMLProps<HTMLAttributes<HTMLBRElement>, HTMLBRElement>;
        button: DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
        canvas: DetailedHTMLProps<CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
        caption: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        cite: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        code: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        col: DetailedHTMLProps<ColHTMLAttributes<HTMLTableColElement>, HTMLTableColElement>;
        colgroup: DetailedHTMLProps<ColgroupHTMLAttributes<HTMLTableColElement>, HTMLTableColElement>;
        data: DetailedHTMLProps<DataHTMLAttributes<HTMLDataElement>, HTMLDataElement>;
        datalist: DetailedHTMLProps<HTMLAttributes<HTMLDataListElement>, HTMLDataListElement>;
        dd: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        del: DetailedHTMLProps<DelHTMLAttributes<HTMLElement>, HTMLElement>;
        details: DetailedHTMLProps<DetailsHTMLAttributes<HTMLElement>, HTMLElement>;
        dfn: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        dialog: DetailedHTMLProps<DialogHTMLAttributes<HTMLDialogElement>, HTMLDialogElement>;
        div: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
        dl: DetailedHTMLProps<HTMLAttributes<HTMLDListElement>, HTMLDListElement>;
        dt: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        em: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        embed: DetailedHTMLProps<EmbedHTMLAttributes<HTMLEmbedElement>, HTMLEmbedElement>;
        fieldset: DetailedHTMLProps<FieldsetHTMLAttributes<HTMLFieldSetElement>, HTMLFieldSetElement>;
        figcaption: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        figure: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        footer: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        form: DetailedHTMLProps<FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;
        h1: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
        h2: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
        h3: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
        h4: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
        h5: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
        h6: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
        head: DetailedHTMLProps<HTMLAttributes<HTMLHeadElement>, HTMLHeadElement>;
        header: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        hgroup: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        hr: DetailedHTMLProps<HTMLAttributes<HTMLHRElement>, HTMLHRElement>;
        html: DetailedHTMLProps<HtmlHTMLAttributes<HTMLHtmlElement>, HTMLHtmlElement>;
        i: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        iframe: DetailedHTMLProps<IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement>;
        img: DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
        input: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
        ins: DetailedHTMLProps<InsHTMLAttributes<HTMLModElement>, HTMLModElement>;
        kbd: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        keygen: DetailedHTMLProps<KeygenHTMLAttributes<HTMLElement>, HTMLElement>;
        label: DetailedHTMLProps<LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
        legend: DetailedHTMLProps<HTMLAttributes<HTMLLegendElement>, HTMLLegendElement>;
        li: DetailedHTMLProps<LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>;
        link: DetailedHTMLProps<LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>;
        main: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        map: DetailedHTMLProps<MapHTMLAttributes<HTMLMapElement>, HTMLMapElement>;
        mark: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        menu: DetailedHTMLProps<MenuHTMLAttributes<HTMLElement>, HTMLElement>;
        menuitem: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        meta: DetailedHTMLProps<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>;
        meter: DetailedHTMLProps<MeterHTMLAttributes<HTMLElement>, HTMLElement>;
        nav: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        noindex: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        noscript: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        object: DetailedHTMLProps<ObjectHTMLAttributes<HTMLObjectElement>, HTMLObjectElement>;
        ol: DetailedHTMLProps<OlHTMLAttributes<HTMLOListElement>, HTMLOListElement>;
        optgroup: DetailedHTMLProps<OptgroupHTMLAttributes<HTMLOptGroupElement>, HTMLOptGroupElement>;
        option: DetailedHTMLProps<OptionHTMLAttributes<HTMLOptionElement>, HTMLOptionElement>;
        output: DetailedHTMLProps<OutputHTMLAttributes<HTMLElement>, HTMLElement>;
        p: DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
        param: DetailedHTMLProps<ParamHTMLAttributes<HTMLParamElement>, HTMLParamElement>;
        picture: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        pre: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>;
        progress: DetailedHTMLProps<ProgressHTMLAttributes<HTMLProgressElement>, HTMLProgressElement>;
        q: DetailedHTMLProps<QuoteHTMLAttributes<HTMLQuoteElement>, HTMLQuoteElement>;
        rp: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        rt: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        ruby: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        s: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        samp: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        slot: DetailedHTMLProps<SlotHTMLAttributes<HTMLSlotElement>, HTMLSlotElement>;
        script: DetailedHTMLProps<ScriptHTMLAttributes<HTMLScriptElement>, HTMLScriptElement>;
        section: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        select: DetailedHTMLProps<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;
        small: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        source: DetailedHTMLProps<SourceHTMLAttributes<HTMLSourceElement>, HTMLSourceElement>;
        span: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
        strong: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        style: DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>;
        sub: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        summary: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        sup: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        table: DetailedHTMLProps<TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>;
        template: DetailedHTMLProps<HTMLAttributes<HTMLTemplateElement>, HTMLTemplateElement>;
        tbody: DetailedHTMLProps<HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
        td: DetailedHTMLProps<TdHTMLAttributes<HTMLTableDataCellElement>, HTMLTableDataCellElement>;
        textarea: DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;
        tfoot: DetailedHTMLProps<HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
        th: DetailedHTMLProps<
          ThHTMLAttributes<HTMLTableHeaderCellElement>,
          HTMLTableHeaderCellElement>;
        thead: DetailedHTMLProps<HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
        time: DetailedHTMLProps<TimeHTMLAttributes<HTMLElement>, HTMLElement>;
        title: DetailedHTMLProps<HTMLAttributes<HTMLTitleElement>, HTMLTitleElement>;
        tr: DetailedHTMLProps<HTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement>;
        track: DetailedHTMLProps<TrackHTMLAttributes<HTMLTrackElement>, HTMLTrackElement>;
        u: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        ul: DetailedHTMLProps<HTMLAttributes<HTMLUListElement>, HTMLUListElement>;
        'var': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        video: DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
        wbr: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        // webview: DetailedHTMLProps<WebViewHTMLAttributes<HTMLWebViewElement>, HTMLWebViewElement>;
    
        // SVG
        svg: SVGProps<SVGSVGElement>;
    
        animate: SVGProps<SVGElement>;
        // TODO: It is SVGAnimateElement but is not in TypeScript's lib.dom.d.ts for now.
        animateMotion: SVGProps<SVGElement>;
        animateTransform: SVGProps<SVGElement>;
        // TODO: It is SVGAnimateTransformElement but is not in TypeScript's lib.dom.d.ts for now.
        circle: SVGProps<SVGCircleElement>;
        clipPath: SVGProps<SVGClipPathElement>;
        defs: SVGProps<SVGDefsElement>;
        desc: SVGProps<SVGDescElement>;
        ellipse: SVGProps<SVGEllipseElement>;
        feBlend: SVGProps<SVGFEBlendElement>;
        feColorMatrix: SVGProps<SVGFEColorMatrixElement>;
        feComponentTransfer: SVGProps<SVGFEComponentTransferElement>;
        feComposite: SVGProps<SVGFECompositeElement>;
        feConvolveMatrix: SVGProps<SVGFEConvolveMatrixElement>;
        feDiffuseLighting: SVGProps<SVGFEDiffuseLightingElement>;
        feDisplacementMap: SVGProps<SVGFEDisplacementMapElement>;
        feDistantLight: SVGProps<SVGFEDistantLightElement>;
        feDropShadow: SVGProps<SVGFEDropShadowElement>;
        feFlood: SVGProps<SVGFEFloodElement>;
        feFuncA: SVGProps<SVGFEFuncAElement>;
        feFuncB: SVGProps<SVGFEFuncBElement>;
        feFuncG: SVGProps<SVGFEFuncGElement>;
        feFuncR: SVGProps<SVGFEFuncRElement>;
        feGaussianBlur: SVGProps<SVGFEGaussianBlurElement>;
        feImage: SVGProps<SVGFEImageElement>;
        feMerge: SVGProps<SVGFEMergeElement>;
        feMergeNode: SVGProps<SVGFEMergeNodeElement>;
        feMorphology: SVGProps<SVGFEMorphologyElement>;
        feOffset: SVGProps<SVGFEOffsetElement>;
        fePointLight: SVGProps<SVGFEPointLightElement>;
        feSpecularLighting: SVGProps<SVGFESpecularLightingElement>;
        feSpotLight: SVGProps<SVGFESpotLightElement>;
        feTile: SVGProps<SVGFETileElement>;
        feTurbulence: SVGProps<SVGFETurbulenceElement>;
        filter: SVGProps<SVGFilterElement>;
        foreignObject: SVGProps<SVGForeignObjectElement>;
        g: SVGProps<SVGGElement>;
        image: SVGProps<SVGImageElement>;
        line: SVGProps<SVGLineElement>;
        linearGradient: SVGProps<SVGLinearGradientElement>;
        marker: SVGProps<SVGMarkerElement>;
        mask: SVGProps<SVGMaskElement>;
        metadata: SVGProps<SVGMetadataElement>;
        mpath: SVGProps<SVGElement>;
        path: SVGProps<SVGPathElement>;
        pattern: SVGProps<SVGPatternElement>;
        polygon: SVGProps<SVGPolygonElement>;
        polyline: SVGProps<SVGPolylineElement>;
        radialGradient: SVGProps<SVGRadialGradientElement>;
        rect: SVGProps<SVGRectElement>;
        stop: SVGProps<SVGStopElement>;
        switch: SVGProps<SVGSwitchElement>;
        symbol: SVGProps<SVGSymbolElement>;
        text: SVGProps<SVGTextElement>;
        textPath: SVGProps<SVGTextPathElement>;
        tspan: SVGProps<SVGTSpanElement>;
        use: SVGProps<SVGUseElement>;
        view: SVGProps<SVGViewElement>;
      }
    }  
  }  
}
