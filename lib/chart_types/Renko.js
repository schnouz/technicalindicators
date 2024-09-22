import { CandleList } from '../StockData';
import { atr } from '../directionalmovement/ATR';
import { Indicator, IndicatorInput } from '../indicator/indicator';

export class RenkoInput extends IndicatorInput {}

class Renko extends Indicator {
    constructor(input) {
        super(input);
        let useATR = input.useATR;
        let brickSize = input.brickSize || 0;
        let brickSizeDivider = input.brickSizeDivider || 1;
        if (useATR) {
            let atrResult = atr(Object.assign({}, input));
            brickSize = atrResult[atrResult.length - 1] / brickSizeDivider;
        }
        this.result = new CandleList();
        if (brickSize === 0) {
            console.error('Not enough data to calculate brickSize for renko when using ATR');
            return;
        }
        let lastOpen = 0;
        let lastClose = 0;
        this.generator = (function* () {
            let candleData = yield;
            while (true) {
                if (lastOpen === 0) {
                    lastOpen = candleData.close;
                    lastClose = candleData.close;
                    candleData = yield;
                    continue;
                }
                let absoluteMovementFromClose = Math.abs(candleData.close - lastClose);
                let absoluteMovementFromOpen = Math.abs(candleData.close - lastOpen);
                if ((absoluteMovementFromClose >= brickSize) && (absoluteMovementFromOpen >= brickSize)) {
                    let reference = absoluteMovementFromClose > absoluteMovementFromOpen ? lastOpen : lastClose;
                    let calculated = {
                        open: reference,
                        high: reference > candleData.close ? (reference) : (reference + brickSize),
                        low: reference > candleData.close ? (reference - brickSize) : (reference),
                        close: reference > candleData.close ? (reference - brickSize) : (reference + brickSize),
                        volume: candleData.volume,
                        timestamp: candleData.timestamp
                    };
                    lastOpen = calculated.open;
                    lastClose = calculated.close;
                    candleData = yield calculated;
                } else {
                    candleData = yield;
                }
            }
        })();
        this.generator.next();
        input.low.forEach((tick, index) => {
            var result = this.generator.next({
                open: input.open[index],
                high: input.high[index],
                low: input.low[index],
                close: input.close[index],
                volume: input.volume[index],
                timestamp: input.timestamp[index]
            });
            if (result.value) {
                this.result.open.push(result.value.open);
                this.result.high.push(result.value.high);
                this.result.low.push(result.value.low);
                this.result.close.push(result.value.close);
                this.result.volume.push(result.value.volume);
                this.result.timestamp.push(result.value.timestamp);
            }
        });
    }
    nextValue(price) {
        console.error('Cannot calculate next value on Renko, Every value has to be recomputed for every change, use calculate method');
        return null;
    }
}
Renko.calculate = renko;
export function renko(input) {
    Indicator.reverseInputs(input);
    var result = new Renko(input).result;
    if (input.reversedInput) {
        result.open.reverse();
        result.high.reverse();
        result.low.reverse();
        result.close.reverse();
        result.volume.reverse();
        result.timestamp.reverse();
    }
    Indicator.reverseInputs(input);
    return result;
}
