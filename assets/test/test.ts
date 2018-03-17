const {ccclass, property} = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {

    @property(cc.Prefab)
    meskPrefab: cc.Prefab = null;

    @property(cc.Node)
    sheepNode: cc.Node = null;

    start () {
        var point = this.sheepNode.getPosition();
        var sf = this.sheepNode.getComponent(cc.Sprite).spriteFrame;
        
        var mask = cc.instantiate(this.meskPrefab);
        mask.getComponent("maskBg").init(this.node, point, sf);


    };

    // update (dt) {},
}
