import Puzzle from "./Puzzle";
import ShaderUtils from "./ShaderUtils";

const {ccclass, property} = cc._decorator;

// 拼图的四边
export enum Dir {
    u,
    r,
    d,
    l,
}

export enum Shape {
    a, // 凹边
    p, // 平边
    t, // 凸边
}

@ccclass
export default class Puzzle2 extends Puzzle {
    private static mPuzzleCache: Puzzle2[][] = [];
    public dPosition: cc.Vec2 = null;
    private mIsImageLoaded: boolean = false;

    private static revShape(shape: Shape): Shape {
        if (shape === Shape.p) {
            cc.error("should not be p!");
            return;
        }
        return shape === Shape.a ? Shape.t : Shape.a;
    }
    private static randShape(): Shape {
        return Math.random() > 0.5 ? Shape.a : Shape.t;
        // return Shape.a;
    }
    private static shapeOffset(shape: Shape[]): cc.Vec2 {
        const offset = cc.p(0, 0);
        if (shape[Dir.l] === Shape.p && shape[Dir.r] === Shape.t) {
            offset.x = 12;
        } else if (shape[Dir.l] === Shape.t && shape[Dir.r] === Shape.p) {
            offset.x = -12;
        } else if (shape[Dir.l] === Shape.t && shape[Dir.r] === Shape.a) {
            offset.x = -12;
        } else if (shape[Dir.l] === Shape.a && shape[Dir.r] === Shape.t) {
            offset.x = 12;
        }

        if (shape[Dir.u] === Shape.a && shape[Dir.d] === Shape.p) {
            offset.y = 0;
        } else if (shape[Dir.u] === Shape.t && shape[Dir.d] === Shape.p) {
            offset.y = 12;
        } else if (shape[Dir.u] === Shape.p && shape[Dir.d] === Shape.t) {
            offset.y = -12;
        } else if (shape[Dir.u] === Shape.a && shape[Dir.d] === Shape.t) {
            offset.y = -12;
        } else if (shape[Dir.u] === Shape.t && shape[Dir.d] === Shape.a) {
            offset.y = 12;
        }
        return offset;
    }

    private mImage: cc.Sprite = null;

    public init(pos: cc.Vec2, shape: number[]) {
        super.init(pos);
        this.mImage = this.node.getChildByName("image").getComponent(cc.Sprite);

        if (!Puzzle2.mPuzzleCache[pos.y]) {
            Puzzle2.mPuzzleCache[pos.y] = [];
        }
        Puzzle2.mPuzzleCache[pos.y][pos.x] = this;

        if (shape && shape.length > 0) {
            this.mShape = shape;
        } else {
            if (pos.x === 0) {
                this.mShape[Dir.l] = Shape.p;
            } else {
                this.mShape[Dir.l] = Puzzle2.revShape(Puzzle2.mPuzzleCache[pos.y][pos.x - 1].mShape[Dir.r]);
                if (pos.x === Puzzle.puzzleMapSize.width - 1) {
                    this.mShape[Dir.r] = Shape.p;
                }
            }

            if (pos.y === 0) {
                this.mShape[Dir.d] = Shape.p;
            } else {
                this.mShape[Dir.d] = Puzzle2.revShape(Puzzle2.mPuzzleCache[pos.y - 1][pos.x].mShape[Dir.u]);
                if (pos.y === Puzzle.puzzleMapSize.height - 1) {
                    this.mShape[Dir.u] = Shape.p;
                }
            }

            for (let index = 0; index <= Dir.l; index++) {
                const element = this.mShape[index];
                // cc.log(pos, index, element);
                if (element === undefined) {
                    this.mShape[index] = Puzzle2.randShape();
                }
            }
        }

        const url = "template/" + this.mShape.join("");
        this.dPosition = Puzzle2.shapeOffset(this.mShape);
        this.mImage.node.position = cc.pAdd(this.mImage.node.position, this.dPosition);
        cc.loader.loadRes(url, cc.SpriteFrame, (error: Error, resource: any) => {
            this.mImage.spriteFrame = resource;
            this.mIsImageLoaded = true;
            this.onStartGame();
        });

        const converUrl = "cover/" + this.mShape.join("");
        cc.loader.loadRes(converUrl, cc.SpriteFrame, (error: Error, resource: any) => {
            this.mImage.getComponent(ShaderUtils).spritetextOverlay = resource;
            this.onStartGame();
        });

        this.mImage.getComponent(ShaderUtils).waterSprite = Puzzle.mBackground;
    }

    public onStartGame(): void {
        if (!this.mIsImageLoaded || !this.mImage.getComponent(ShaderUtils).spritetextOverlay) {
            return;
        }
        const bgSize = this.mImage.getComponent(ShaderUtils).waterSprite.getRect();
        let offX = 0;
        let offY = 0;
        if (this.mShape[Dir.l] === Shape.t) {
            offX = 25;
        }
        if (this.mShape[Dir.u] === Shape.t) {
            offY = 25;
        }
        const posx = (this.shaderPos.x - offX * Puzzle.numberScale) / bgSize.width;
        const posy = (this.shaderPos.y - offY * Puzzle.numberScale) / bgSize.height;
        const rectX = this.mImage.node.getBoundingBox().width / bgSize.width * Puzzle.numberScale;
        const rectY = this.mImage.node.getBoundingBox().height / bgSize.height * Puzzle.numberScale;
        this.mImage.getComponent(ShaderUtils).onInitGLProgram(posx, posy, rectX, rectY);
    }
}
