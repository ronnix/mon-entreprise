import { any, equals, is, map, max, mergeWith, pluck, reduce } from 'ramda'
import React from 'react'
import { Node } from '../components/mecanisms/common'
import { collectNodeMissing, evaluateNode, makeJsx } from '../evaluation'

const evaluate = (cache, situation, parsedRules, node) => {
	const evaluateOne = child =>
			evaluateNode(cache, situation, parsedRules, child),
		explanation = map(evaluateOne, node.explanation),
		values = pluck('nodeValue', explanation),
		nodeValue = any(equals(true), values)
			? true
			: any(equals(null), values)
			? null
			: false,
		// Unlike most other array merges of missing variables this is a "flat" merge
		// because "one of these conditions" tend to be several tests of the same variable
		// (e.g. contract type is one of x, y, z)
		missingVariables =
			nodeValue == null
				? reduce(mergeWith(max), {}, map(collectNodeMissing, explanation))
				: {}
	return { ...node, nodeValue, explanation, missingVariables }
}

export const mecanismOneOf = (recurse, k, v) => {
	if (!is(Array, v)) throw new Error('should be array')
	const explanation = map(recurse, v)
	const jsx = ({ nodeValue, explanation, unit }) => (
		<Node
			classes="mecanism conditions list"
			name="une de ces conditions"
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
		evaluate,
		jsx,
		explanation,
		category: 'mecanism',
		name: 'une de ces conditions',
		type: 'boolean'
	}
}
