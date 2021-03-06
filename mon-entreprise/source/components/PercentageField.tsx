import { formatValue } from 'publicodes'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { debounce as debounceFn } from '../utils'
import './PercentageField.css'

export default function PercentageField({ onChange, value, debounce = 0 }) {
	const [localValue, setLocalValue] = useState(value)
	const debouncedOnChange = useCallback(
		debounce ? debounceFn(debounce, onChange) : onChange,
		[debounce, onChange]
	)
	const language = useTranslation().i18n.language

	return (
		<div>
			<input
				className="range"
				onChange={e => {
					const value = e.target.value
					setLocalValue(value)
					debouncedOnChange(value)
				}}
				type="range"
				value={localValue}
				name="volume"
				min="0"
				step="0.05"
				max="1"
			/>
			<span style={{ display: 'inline-block', width: '3em' }}>
				{formatValue({
					nodeValue: localValue,
					language,
					unit: '%'
				})}
			</span>
		</div>
	)
}
