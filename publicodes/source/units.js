"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var ramda_1 = require("ramda");
var i18n_1 = require("./i18n");
//TODO this function does not handle complex units like passenger-kilometer/flight
exports.parseUnit = function (string, lng) {
    if (lng === void 0) { lng = 'fr'; }
    var _a = string.split('/'), a = _a[0], b = _a.slice(1), result = {
        numerators: a
            .split('.')
            .filter(Boolean)
            .map(function (unit) { return getUnitKey(unit, lng); }),
        denominators: b.map(function (unit) { return getUnitKey(unit, lng); })
    };
    return result;
};
var translations = function (lng) {
    return Object.entries(i18n_1["default"].getResourceBundle(lng, 'units'));
};
function getUnitKey(unit, lng) {
    var _a;
    var key = (_a = translations(lng)
        .find(function (_a) {
        var trans = _a[1];
        return trans === unit;
    })) === null || _a === void 0 ? void 0 : _a[0].replace(/_plural$/, '');
    return key || unit;
}
var printUnits = function (units, count, lng) {
    return units
        .filter(function (unit) { return unit !== '%'; })
        .map(function (unit) { return i18n_1["default"].t("units:" + unit, { count: count, lng: lng }); })
        .join('.');
};
var plural = 2;
exports.serializeUnit = function (rawUnit, count, lng) {
    if (count === void 0) { count = plural; }
    if (lng === void 0) { lng = 'fr'; }
    if (rawUnit === null || typeof rawUnit !== 'object') {
        return typeof rawUnit === 'string'
            ? i18n_1["default"].t("units:" + rawUnit, { count: count, lng: lng })
            : rawUnit;
    }
    var unit = simplify(rawUnit), _a = unit.numerators, numerators = _a === void 0 ? [] : _a, _b = unit.denominators, denominators = _b === void 0 ? [] : _b;
    // the unit '%' is only displayed when it is the only unit
    var merge = __spreadArrays(numerators, denominators);
    if (merge.length === 1 && merge[0] === '%')
        return '%';
    var n = !ramda_1.isEmpty(numerators);
    var d = !ramda_1.isEmpty(denominators);
    var string = !n && !d
        ? ''
        : n && !d
            ? printUnits(numerators, count, lng)
            : !n && d
                ? "/" + printUnits(denominators, 1, lng)
                : printUnits(numerators, plural, lng) + " / " + printUnits(denominators, 1, lng);
    return string;
};
var noUnit = { numerators: [], denominators: [] };
exports.inferUnit = function (operator, rawUnits) {
    var units = rawUnits.map(function (u) { return u || noUnit; });
    if (operator === '*')
        return simplify({
            numerators: ramda_1.unnest(units.map(function (u) { return u.numerators; })),
            denominators: ramda_1.unnest(units.map(function (u) { return u.denominators; }))
        });
    if (operator === '/') {
        if (units.length !== 2)
            throw new Error('Infer units of a division with units.length !== 2)');
        return exports.inferUnit('*', [
            units[0],
            {
                numerators: units[1].denominators,
                denominators: units[1].numerators
            }
        ]);
    }
    if (operator === '-' || operator === '+') {
        return rawUnits.find(function (u) { return u; });
    }
    return undefined;
};
exports.removeOnce = function (element, eqFn) {
    if (eqFn === void 0) { eqFn = ramda_1.equals; }
    return function (list) {
        var index = list.findIndex(function (e) { return eqFn(e, element); });
        if (index > -1)
            return ramda_1.remove(index, 1)(list);
        else
            return list;
    };
};
var simplify = function (unit, eqFn) {
    if (eqFn === void 0) { eqFn = ramda_1.equals; }
    return __spreadArrays(unit.numerators, unit.denominators).reduce(function (_a, next) {
        var numerators = _a.numerators, denominators = _a.denominators;
        return numerators.find(function (u) { return eqFn(next, u); }) &&
            denominators.find(function (u) { return eqFn(next, u); })
            ? {
                numerators: exports.removeOnce(next, eqFn)(numerators),
                denominators: exports.removeOnce(next, eqFn)(denominators)
            }
            : { numerators: numerators, denominators: denominators };
    }, unit);
};
var convertTable = {
    'mois/an': 12,
    'jour/an': 365,
    'jour/mois': 365 / 12,
    'trimestre/an': 4,
    'mois/trimestre': 3,
    'jour/trimestre': (365 / 12) * 3,
    '€/k€': Math.pow(10, 3),
    'g/kg': Math.pow(10, 3),
    'mg/g': Math.pow(10, 3),
    'mg/kg': Math.pow(10, 6)
};
function singleUnitConversionFactor(from, to) {
    return (convertTable[to + "/" + from] ||
        (convertTable[from + "/" + to] && 1 / convertTable[from + "/" + to]));
}
function unitsConversionFactor(from, to) {
    var factor = Math.pow(100, 
    // Factor is mutliplied or divided 100 for each '%' in units
    (to.filter(function (unit) { return unit === '%'; }).length -
        from.filter(function (unit) { return unit === '%'; }).length));
    factor = from.reduce(function (_a, fromUnit) {
        var value = _a[0], toUnits = _a[1];
        var index = toUnits.findIndex(function (toUnit) { return !!singleUnitConversionFactor(fromUnit, toUnit); });
        var factor = singleUnitConversionFactor(fromUnit, toUnits[index]) || 1;
        return [
            value * factor,
            __spreadArrays(toUnits.slice(0, index + 1), toUnits.slice(index + 1))
        ];
    }, [factor, to])[0];
    return factor;
}
function convertUnit(from, to, value) {
    if (!areUnitConvertible(from, to)) {
        throw new Error("Impossible de convertir l'unit\u00E9 '" + exports.serializeUnit(from) + "' en '" + exports.serializeUnit(to) + "'");
    }
    if (!value) {
        return value;
    }
    var _a = simplifyUnitWithValue(from || noUnit), fromSimplified = _a[0], factorTo = _a[1];
    var _b = simplifyUnitWithValue(to || noUnit), toSimplified = _b[0], factorFrom = _b[1];
    return round(((value * factorTo) / factorFrom) *
        unitsConversionFactor(fromSimplified.numerators, toSimplified.numerators) *
        unitsConversionFactor(toSimplified.denominators, fromSimplified.denominators));
}
exports.convertUnit = convertUnit;
var convertibleUnitClasses = [
    ['mois', 'an', 'jour', 'trimestre'],
    ['€', 'k€'],
    ['g', 'kg', 'mg']
];
function areSameClass(a, b) {
    return (a === b ||
        convertibleUnitClasses.some(function (units) { return units.includes(a) && units.includes(b); }));
}
function round(value) {
    return +value.toFixed(16);
}
function simplifyUnit(unit) {
    var _a = simplify(unit, areSameClass), numerators = _a.numerators, denominators = _a.denominators;
    if (numerators.length && numerators.every(function (symb) { return symb === '%'; })) {
        return { numerators: ['%'], denominators: denominators };
    }
    return {
        numerators: ramda_1.without(['%'], numerators),
        denominators: ramda_1.without(['%'], denominators)
    };
}
exports.simplifyUnit = simplifyUnit;
function simplifyUnitWithValue(unit, value) {
    if (value === void 0) { value = 1; }
    var denominators = unit.denominators, numerators = unit.numerators;
    var factor = unitsConversionFactor(numerators, denominators);
    return [
        simplify({
            numerators: ramda_1.without(['%'], numerators),
            denominators: ramda_1.without(['%'], denominators)
        }, areSameClass),
        value ? round(value * factor) : value
    ];
}
function areUnitConvertible(a, b) {
    if (a == null || b == null) {
        return true;
    }
    var countByUnitClass = ramda_1.countBy(function (unit) {
        var classIndex = convertibleUnitClasses.findIndex(function (unitClass) {
            return unitClass.includes(unit);
        });
        return classIndex === -1 ? unit : '' + classIndex;
    });
    var _a = [
        a.numerators,
        a.denominators,
        b.numerators,
        b.denominators
    ].map(countByUnitClass), numA = _a[0], denomA = _a[1], numB = _a[2], denomB = _a[3];
    var unitClasses = ramda_1.pipe(ramda_1.map(ramda_1.keys), ramda_1.flatten, ramda_1.uniq)([numA, denomA, numB, denomB]);
    return unitClasses.every(function (unitClass) {
        return (numA[unitClass] || 0) - (denomA[unitClass] || 0) ===
            (numB[unitClass] || 0) - (denomB[unitClass] || 0) || unitClass === '%';
    });
}
exports.areUnitConvertible = areUnitConvertible;
