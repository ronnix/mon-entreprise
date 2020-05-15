/* eslint-env node */

const webpack = require('webpack')
const { commonLoaders } = require('./common')

module.exports = {
	...common,
	module: {
		rules: [
			...commonLoaders(),
			{
				test: /\.css$/,
				use: ['css-loader', 'postcss-loader']
			}
		]
	},
	mode: 'development',
	plugins: [new webpack.EnvironmentPlugin({ NODE_ENV: 'development' })]
}
