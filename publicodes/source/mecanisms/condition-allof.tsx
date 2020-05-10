import { any, equals, is, map, pluck } from 'ramda'
import React from 'react'
import { Node } from '../components/mecanisms/common'
import { evaluateNode, makeJsx, mergeAllMissing } from '../evaluation'

const evaluate = (cache, situation, parsedRules, node) => {
	const evaluateOne = child =>
			evaluateNode(cache, situation, parsedRules, child),
		explanation = map(evaluateOne, node.explanation),
		values = pluck('nodeValue', explanation),
		nodeValue = any(equals(false), values)
			? false // court-circuit
			: any(equals(null), values)
			? null
			: true,
		missingVariables = nodeValue == null ? mergeAllMissing(explanation) : {}
	return { ...node, nodeValue, explanation, missingVariables }
}

export const mecanismAllOf = (recurse, k, v) => {
	if (!is(Array, v)) throw new Error('should be array')
	const explanation = map(recurse, v)
	const jsx = ({ nodeValue, explanation, unit }) => (
		<Node
			classes="mecanism conditions list"
			name="toutes ces conditions"
			value={nodeValue}
			unit={unit}
		>
			<ul>
				{explanation.map((item, i) => (
					<li key={i}>{makeJsx(item)}</li>
				))}
			</ul>
		</Node>
	)

	return {
		evaluate: evaluate,
		jsx,
		explanation,
		category: 'mecanism',
		name: 'toutes ces conditions',
		type: 'boolean'
	}
}
