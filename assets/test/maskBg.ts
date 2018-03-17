
const {ccclass, property} = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {

    @property(cc.Node)
    bgNode: cc.Node = null;

    @property(cc.Mask)
    maskCom: cc.Mask = null;

    start () {

    }

    init (parent: cc.Node, point: cc.Vec2, sf: cc.SpriteFrame){
        this.node.parent = parent;
        var bgNodePosition = this.node.convertToWorldSpaceAR(this.bgNode.position);
        this.node.position = point;
        this.bgNode.position = this.node.convertToNodeSpaceAR(bgNodePosition);

        this.maskCom.spriteFrame = sf;
    }
}
