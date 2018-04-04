const {ccclass, property} = cc._decorator;
import Puzzle from "./Puzzle";
@ccclass
export default class NewClass extends cc.Component {

    @property(cc.Prefab)
    puzzlePrefab: cc.Prefab = null;

    @property(cc.SpriteFrame)
    puzzlebg: cc.SpriteFrame = null;


    onLoad() {
        Puzzle.setup({
            delegate: this,
            mapSize: cc.size(2,2),
            scale: 2,
            background: this.puzzlebg,
        });

        const node = cc.instantiate(this.puzzlePrefab);
        this.node.addChild(node);
        const puzzle = node.getComponent(Puzzle);
        let targetShape = [2,2,2,2];
        
        puzzle.init(cc.p(1, 1), targetShape);
    }
    onPuzzleNewGroup(){
        cc.log("哈哈");
    }
}
