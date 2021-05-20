import {singularOrPluralRus} from './util';

export function commonFormatCheckCollisionLoopEndedPart(idx, fmtCollisionCount) {
    if (fmtCollisionCount > 0) {
        return `После ${fmtCollisionCount} ${singularOrPluralRus(
            fmtCollisionCount,
            'коллизии',
            'коллизий',
            'коллизий'
        )}, пустая ячейка (индекс <code>${idx}</code>) найдена: ${singularOrPluralRus(
            fmtCollisionCount,
            'коллизия',
            'коллизии',
            'коллизий'
        )} успешно разрешена`;
    } else {
        return `Ячейка с индексом <code>${idx}</code> пуста: разрешать коллизии не требуется`;
    }
}

export function chapter1_2_FormatCheckCollision(l, idx, fmtCollisionCount) {
    if (l.get(idx) == null) {
        return commonFormatCheckCollisionLoopEndedPart(idx, fmtCollisionCount);
    } else {
        return `[Попытка №${fmtCollisionCount + 1}] Ячейка с индексом <code>${idx}</code> занята: произошла коллизия`;
    }
}

const _defaultIsEmpty = (l, i) => l.get(i) == null;
export function commonFormatCheckNotFound(l, idx, fmtCollisionCount, isEmpty = _defaultIsEmpty) {
    const tryN = fmtCollisionCount + 1;
    if (isEmpty(l, idx)) {
        if (fmtCollisionCount == 0) {
            return `[Попытка №${tryN}] Ячейка с индексом <code>${idx}</code> пуста, поэтому не входим в цикл`;
        } else {
            return `[Попытка №${tryN}] Ячейка с индексом <code>${idx}</code> пуста, прекращаем цикл`;
        }
    } else {
        return `[Попытка №${tryN}] Ячейка с индексом <code>${idx}</code> занята, проверим ее`;
    }
}
