// tslint:disable:variable-name
const {ccclass, property} = cc._decorator;

// var _default_vert_no_mvp = require("../../Shader/gray_vsh.js");
// var _default_vert = require("../../Shader/gray_vsh.js");
// var _black_white_frag = require("../../Shader/gray_fsh.js");
const vertShaderVert = `
attribute vec4 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_color;

varying vec4 v_fragmentColor;
varying vec2 v_texCoord;

void main()
{
    gl_Position = CC_PMatrix * a_position;
    v_fragmentColor = a_color;
    v_texCoord = a_texCoord;
}
`;

const vertShaderFrag = `
varying vec4 v_fragmentColor;
varying vec2 v_texCoord;

// 遮罩
uniform sampler2D texBackground;
uniform float rect_x;
uniform float rect_y;
uniform float rect_w;
uniform float rect_h;

// 混合: 叠加
uniform sampler2D textOverlay;

float blendOverlay(float base, float blend) {
	return base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
	return vec3(blendOverlay(base.r,blend.r),blendOverlay(base.g,blend.g),blendOverlay(base.b,blend.b));
}

void main()
{
    vec4 v_orColor = v_fragmentColor * texture2D(CC_Texture0, v_texCoord);
    vec4 v_overlayColor = texture2D(textOverlay, v_texCoord);
    vec2 tt = vec2(rect_x + v_texCoord.x * rect_w, rect_y + v_texCoord.y * rect_h);
    vec4 v_texColor = texture2D(texBackground, tt);

    // vec4 myC = v_texColor;
    // myC.a = v_orColor.a;

    vec4 myC = vec4(
        blendOverlay(v_texColor.r, v_overlayColor.r),
        blendOverlay(v_texColor.g, v_overlayColor.g),
        blendOverlay(v_texColor.b, v_overlayColor.b),
        v_overlayColor.a
    );
    v_texColor.a = v_orColor.a;
    myC = myC * v_overlayColor.a + (1.0 - v_overlayColor.a) * v_texColor;

    gl_FragColor = myC;
}
`;
@ccclass
export default class ShaderUtils extends cc.Component {
    @property(cc.SpriteFrame)
    public waterSprite: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    public spritetextOverlay: cc.SpriteFrame = null;

    // @property({
    //     type: cc.String,
    //     displayName: "Vert No MVP Native",
    //     tooltip: "native顶点着色器的代码模块名称（文件名），比如：gray_vsh。",
    // })
    public vert_no_mvp = vertShaderVert;

    // @property({
    //     type: cc.String,
    //     displayName: "Vert Web",
    //     tooltip: "web顶点着色器的代码模块名称（文件名），比如：gray_vsh。",
    // })
    public vert = vertShaderVert;

    // @property({
    //     type: cc.String,
    //     displayName: "Frag",
    //     tooltip: "片元着色器的代码模块名称（文件名），比如：gray_fsh。",
    // })
    public frag = vertShaderFrag;

    @property({
        type: cc.Boolean,
        displayName: "Show Debug Logs",
        tooltip: "是否显示调试日志",
    })

    public isShowDebugLogs = false;
    private glNode: any;
    private _program: any;
    private _black_white_frag: any;
    private _default_vert: any;
    private _default_vert_no_mvp: any;

    public static sSpriteOverlay: cc.SpriteFrame = null;

    /**
     * 读取渲染程序代码
     */
    public loadShaderCode() {
        // 取到ccsg.Node对象，这里我使用在精灵上，所以节点上必须挂载“cc.Sprite”组件
        this.glNode = this.getComponent("cc.Sprite")._sgNode;

        // if (cc.sys.isNative) {
        //     this._default_vert_no_mvp = _default_vert_no_mvp;
        // } else {
        //     this._default_vert = _default_vert;
        // }
        // this._black_white_frag = _black_white_frag;

        if (this.isShowDebugLogs) {cc.log("【WShaderUtil】require GL code from module."); }
        if (cc.sys.isNative) {
            if (this.isShowDebugLogs) {cc.log("【WShaderUtil】require vert_no_mvp from module."); }
            this._default_vert_no_mvp = this.vert_no_mvp;
        } else {
            if (this.isShowDebugLogs) {cc.log("【WShaderUtil】require vert from module."); }
            this._default_vert = this.vert;
        }
        if (this.isShowDebugLogs) {cc.log("【WShaderUtil】require frag from module."); }
        this._black_white_frag = this.frag;
    }

    /**
     * 初始化GLProgram
     */
    public onInitGLProgram(rect_x, rect_y, rect_w, rect_h) {
        this.loadShaderCode();
        if (this.isShowDebugLogs) {cc.log("【WShaderUtil】init GL Program."); }
        this._program = new cc.GLProgram();

        if (cc.sys.isNative) {
            if (this.isShowDebugLogs) {cc.log("【WShaderUtil】use native GLProgram"); }
            this._program.initWithString(this._default_vert_no_mvp, this._black_white_frag);
            this._program.link();
            this._program.updateUniforms();
        } else {
            if (this.isShowDebugLogs) {cc.log("【WShaderUtil】use webGL GLProgram"); }
            this._program.initWithVertexShaderByteArray(this._default_vert, this._black_white_frag);
            this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_POSITION, cc.macro.VERTEX_ATTRIB_POSITION);
            this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_COLOR, cc.macro.VERTEX_ATTRIB_COLOR);
            this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_TEX_COORD, cc.macro.VERTEX_ATTRIB_TEX_COORDS);
            this._program.link();
            this._program.updateUniforms();
        }
        this.setProgram(this.glNode, this._program, rect_x, rect_y, rect_w, rect_h);
        if (this.isShowDebugLogs) {cc.log("【WShaderUtil】use GL Program success."); }
    }

    /**
     * 设置GLProgram
     * @param {ccsg.Node} sgNode
     * @param {cc.GLProgram} glProgram
     */
    public setProgram(sgNode, glProgram, rect_x, rect_y, rect_w, rect_h) {
        if (this.isShowDebugLogs) {cc.log("【WShaderUtil】set GL Program."); }
        if (!sgNode) {
            sgNode = this.getComponent("cc.Sprite")._sgNode;
            cc.log("没有sgnode？？？？？");
            if (!sgNode) {
                cc.log("还是没有sgnode");
                return;
            }
        }
        if (!glProgram) {
            glProgram = this._program;
            cc.log("没有  glProgram ？？？？？");
        }
        if (cc.sys.isNative) {
            const glProgram_state = cc.GLProgramState.getOrCreateWithGLProgram(glProgram);
            glProgram_state.setUniformTexture("texBackground", this.waterSprite.getTexture());
            glProgram_state.setUniformTexture("textOverlay", this.spritetextOverlay.getTexture()); // 高光贴图
            glProgram_state.setUniformFloat("rect_x", rect_x);
            glProgram_state.setUniformFloat("rect_y", rect_y);
            glProgram_state.setUniformFloat("rect_w", rect_w);
            glProgram_state.setUniformFloat("rect_h", rect_h);
            // glProgram_state.setUniformFloat("textureSizeW", this.node.getContentSize().width);
            // glProgram_state.setUniformFloat("textureSizeH", this.node.getContentSize().height);
            // glProgram_state.setUniformFloat("outlineSize", 1);
            // glProgram_state.setUniformVec4("bg_rect", cc.size(0.0,0.0,0.3,0.4));
            sgNode.setGLProgramState(glProgram_state);
        } else {
            const tex = glProgram.getUniformLocationForName("texBackground");
            // this.waterSprite.getTexture().getPixelFormat()
            // cc.log(cc.gl);
            cc.gl.deleteTexture2D(1);
            cc.gl.bindTexture2DN(1, this.waterSprite.getTexture());
            glProgram.setUniformLocationI32(tex, 1);

            const tex2 = glProgram.getUniformLocationForName("textOverlay");
            // this.waterSprite.getTexture().getPixelFormat()
            // cc.log(cc.gl);
            cc.gl.deleteTexture2D(2);
            cc.gl.bindTexture2DN(2, this.spritetextOverlay.getTexture());
            glProgram.setUniformLocationI32(tex2, 2);

            glProgram.setUniformLocationWith1f("rect_x", rect_x);
            glProgram.setUniformLocationWith1f("rect_y", rect_y);
            glProgram.setUniformLocationWith1f("rect_w", rect_w);
            glProgram.setUniformLocationWith1f("rect_h", rect_h);
            // glProgram.bindTexture(glProgram.GL_TEXTURE_2D, this.waterSprite.getTexture());
            sgNode.setShaderProgram(glProgram);
        }

        const children = sgNode.children;
        if (!children) {
            return;
        }

        // children.forEach((element) => {
        //     this.setProgram(element, glProgram);
        // });
    }
}
