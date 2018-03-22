const {ccclass, property} = cc._decorator;

@ccclass
export default class Helloworld extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null;

    @property
    text: string = 'hello';

    start () {
        // init logic
        this.label.string = this.text;
        
        var hang = 5;
        var lie = 5;
        for( let i = 0; i<hang; i++){
            for(let j=0; j<lie; j++){
                cc.log("num = ", i * lie + j + 1);
            }
        }
    }
}
