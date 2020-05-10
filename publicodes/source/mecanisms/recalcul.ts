import { map } from 'ramda'
import Recalcul from '../components/mecanisms/Recalcul'
import { defaultNode, evaluateNode } from '../evaluation'

const evaluateRecalcul = (cache, situation, parsedRules, node) => {
	if (cache._meta.inRecalcul) {
		return defaultNode(false)
	}
	const recalculCache = { _meta: { ...cache._meta, inRecalcul: true } } // Create an empty cache
	const amendedSituation = map(
		value => evaluateNode(cache, situation, parsedRules, value),
		node.explanation.amendedSituation
	)
	const evaluatedNode = evaluateNode(
		recalculCache,
		{ ...situation, ...amendedSituation },
		parsedRules,
		node.explanation.recalcul
	)
	return {
		...node,
		nodeValue: evaluatedNode.nodeValue,
		...(evaluatedNode.temporalValue && {
			temporalValue: evaluatedNode.temporalValue
		}),
		unit: evaluatedNode.unit,
		explanation: {
			recalcul: evaluatedNode,
			amendedSituation
		}
	}
}

export const mecanismRecalcul = dottedNameContext => (recurse, k, v) => {
	const amendedSituation = Object.fromEntries(
		Object.keys(v.avec).map(dottedName => [
			recurse(dottedName).dottedName,
			recurse(v.avec[dottedName])
		])
	)
	const defaultRuleToEvaluate = dottedNameContext
	const nodeToEvaluate = recurse(v.règle ?? defaultRuleToEvaluate)
	return {
		explanation: {
			recalcul: nodeToEvaluate,
			amendedSituation
		},
		jsx: Recalcul,
		evaluate: evaluateRecalcul
	}
}
