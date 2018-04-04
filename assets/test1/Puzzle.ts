import PuzzleGroup from "./PuzlleGroup";

const {ccclass, property} = cc._decorator;

export interface IPuzzleDelegrate {
    onPuzzleNewGroup(): PuzzleGroup;
}

export interface IPuzzleSetup {
    scale: number;
    mapSize: cc.Size;
    delegate?: IPuzzleDelegrate;
    background: cc.SpriteFrame;
}

type PuzzleMap = {[key: number]: Puzzle};

@ccclass
export default class Puzzle extends cc.Component {
    public onLoad() {}

    public static puzzleUnsolved: PuzzleMap = {};
    public static puzzleGroupList: PuzzleGroup[] = [];
    public static initZ: number = 0;
    public static initId: number = 0;

    public mCR: cc.Vec2;
    public mGroup: PuzzleGroup = null;
    public match: boolean = false;
    public mID: number = 0;
    public shaderPos: cc.Vec2;
    public targetPos: cc.Vec2;
    public mShape: number[] = [];
    public origBgNode: cc.Node;

    public static tipsArr: number[][];
    public static tipsIndex: number;
    public static lastTipsId: number;
    public rotation: number = 0;

    public static puzzleMapSize: cc.Size = null;
    public static numberScale: number;
    protected static mDelegate: IPuzzleDelegrate;
    protected static mBackground: cc.SpriteFrame;

    public static setup(setup: IPuzzleSetup) {
        Puzzle.mDelegate = setup.delegate;
        Puzzle.numberScale = setup.scale;
        Puzzle.puzzleMapSize = setup.mapSize;
        Puzzle.mBackground = setup.background;
    }

    public init(pos: cc.Vec2, rotation?: number[]) {
        const bgSize = Puzzle.mBackground.getRect();
        this.mCR = pos;
        const size = this.node.getContentSize();
        this.shaderPos = cc.p(pos.x * size.width * Puzzle.numberScale, bgSize.height - (pos.y + 1) * size.height * Puzzle.numberScale);
        this.node.position = cc.p((pos.x + 0.5) * size.width * Puzzle.numberScale - bgSize.width / 2 + 10,
            (pos.y + 0.5) * size.height * Puzzle.numberScale - bgSize.height / 2 + 10);
        this.targetPos = this.node.position;
        this.origBgNode = this.node.parent;
        this.node.getChildByName("label").getComponent(cc.Label).string = `${pos.x},${pos.y}`;
        this.mID = pos.x * Puzzle.puzzleMapSize.width + pos.y + 1;
        // cc.log(this.mID);
        Puzzle.initId += 1;
        Puzzle.puzzleUnsolved[this.mID] = this;
    }

    public move(offset: cc.Vec2) {
        const scale = this.node.parent.parent.scale;
        offset.x = offset.x / scale;
        offset.y = offset.y / scale;
        if (this.mGroup) {
            this.mGroup.node.position = cc.pAdd(this.mGroup.node.position, offset);
        } else {
            this.node.position = cc.pAdd(this.node.position, offset);
        }
    }

    public rotate() {
        if (this.node.getNumberOfRunningActions() > 0) {
            return;
        }
        this.rotation = this.node.rotation + 90;
        this.rotation = this.rotation >= 360 ? this.rotation % 360 : this.rotation;
        this.node.runAction(cc.sequence(cc.rotateBy(0.2, 90), cc.callFunc(() => {
            this.node.rotation = this.rotation;
        })));
    }

    public getPuzzleBoundingBox(): cc.Rect {
        return this.node.getBoundingBoxToWorld();
    }

    public getPuzzlePostion(): cc.Vec2 {
        if (this.mGroup) {
            return cc.pAdd(this.node.position, this.mGroup.node.position);
        }
        return this.node.position;
    }

    public getRowColOffset(another: Puzzle): cc.Vec2 {
        return cc.p(this.mCR.x - another.mCR.x, this.mCR.y - another.mCR.y);
    }

    public drag() {
        if (this.mGroup) {
            this.mGroup.node.zIndex = Puzzle.initZ;
        } else {
            this.node.zIndex = Puzzle.initZ;
        }
        Puzzle.initZ += 1;
    }

    public static collide(puzzle: Puzzle, puzzleList: Puzzle[], onlyCheck: boolean = false): boolean {
        let matched = false;
        const size = puzzle.node.getContentSize();
        for (let index = 0; index < puzzleList.length; index++) {
            const targetPuzzle = puzzleList[index];
            const rowColOffset = puzzle.getRowColOffset(targetPuzzle);
            // if (Math.abs(rowColOffset.x) <= 1 && Math.abs(rowColOffset.y) <= 1) {//八方向
            if (Math.abs(rowColOffset.x) + Math.abs(rowColOffset.y) === 1) {// 四方向
                const currentOffset = cc.pSub(puzzle.getPuzzlePostion(), targetPuzzle.getPuzzlePostion());
                const targetOffset = cc.p(rowColOffset.x * size.width * this.numberScale, rowColOffset.y * size.height * this.numberScale);
                const diff = cc.pSub(targetOffset, currentOffset);
                if (Math.abs(diff.x) <= 20 && Math.abs(diff.y) <= 20) {
                    matched = true;
                    // 吸附效果
                    // if (puzzle.mGroup || !targetPuzzle.mGroup) {
                    //     targetPuzzle.move(cc.pMult(diff, -1));
                    // } else {
                    puzzle.move(diff);
                    // }
                    if (onlyCheck) {
                        return true;
                    }
                    // 组转移
                    if (!puzzle.mGroup) {
                        if (!targetPuzzle.mGroup) {
                            const group = Puzzle.mDelegate.onPuzzleNewGroup();
                            group.node.position = targetPuzzle.node.position;
                            group.addPuzzle(targetPuzzle);
                            Puzzle.puzzleGroupList.push(group);
                        }
                        targetPuzzle.mGroup.addPuzzle(puzzle);
                    } else {
                        puzzle.mGroup.addPuzzle(targetPuzzle);
                    }
                }
            }
        }
        return matched;
    }

    public setGroup(groupPos: cc.Vec2, groupIds: number[]): void {
        const group = Puzzle.mDelegate.onPuzzleNewGroup();
        group.node.position = groupPos;
        let isPushed = false;
        groupIds.forEach((element: number) => {
            if (Puzzle.puzzleUnsolved[element] == null) {
                isPushed = true;
                return;
            }
            group.addPuzzle(Puzzle.puzzleUnsolved[element]);
        });
        if (isPushed) {
            return;
        }
        Puzzle.puzzleGroupList.push(group);
        // cc.log(Puzzle.puzzleUnsolved);
    }

    public static groupCollide(puzzle: Puzzle) {
        for (let index = 0; index < Puzzle.puzzleGroupList.length; index++) {
            const group = Puzzle.puzzleGroupList[index];
            if (puzzle.mGroup && puzzle.mGroup === group) {
                continue;
            }
            if (Puzzle.collide(puzzle, group.puzlleList, true)) {
                if (puzzle.mGroup) {
                    Puzzle.puzzleGroupList.splice(index, 1);
                    --index;
                    for (let groupid = 0; groupid < group.puzlleList.length; groupid++) {
                        puzzle.mGroup.addPuzzle(group.puzlleList[groupid]);
                    }
                    group.node.destroy();
                } else {
                    group.addPuzzle(puzzle);
                }
            }
        }
    }

    public drop() {
        this.onMatch();
        if (this.mGroup) {
            this.mGroup.puzlleList.forEach((element) => {
                Puzzle.collide(element, Object.values(Puzzle.puzzleUnsolved));
                Puzzle.groupCollide(element);
            });
        } else {
            Puzzle.collide(this, Object.values(Puzzle.puzzleUnsolved));
            Puzzle.groupCollide(this);
        }
    }

    // 判断到指定坐标后，不参与drop的group移动和判断
    public onMatch() {
        const nativeTargetPos = this.node.parent.convertToNodeSpaceAR(this.origBgNode.convertToWorldSpaceAR(this.targetPos));
        if (cc.pDistance(nativeTargetPos, this.node.position) <= 30 && this.node.rotation === 0) {
            const diff2 = cc.pSub(nativeTargetPos, this.node.position);
            this.match = true;
            if (this.mGroup !== null) {
                for (let i = 0; i < this.mGroup.puzlleList.length; i++) {
                    this.mGroup.puzlleList[i].match = true;
                }
            }
            this.move(diff2);
        }
        if (this.match === true) {
            cc.log("match");
            if (this.mGroup) {
                this.mGroup.node.setLocalZOrder(0);
                for (let index = 0; index < Puzzle.puzzleGroupList.length; index++) {
                    const group = Puzzle.puzzleGroupList[index];
                    if (this.mGroup && this.mGroup === group) {
                        Puzzle.puzzleGroupList.splice(index, 1);
                        break;
                    }
                }
            } else {
                if (!!Puzzle.puzzleUnsolved[this.mID]) {
                    Puzzle.puzzleUnsolved[this.mID].node.setLocalZOrder(0);
                    delete Puzzle.puzzleUnsolved[this.mID];
                }
            }
        }
    }

    public setGroupZorder(): void {
        if (this.mGroup) {
            this.mGroup.node.setLocalZOrder(this.node.getLocalZOrder());
        }
    }

    public reset(): void {
        if (this.mGroup) {
            this.mGroup.puzlleList.splice(0, this.mGroup.puzlleList.length);
            this.mGroup = null;
        }
        this.match = false;
    }
}
