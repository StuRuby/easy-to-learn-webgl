const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ProgressBarWebpackPlugin = require('progress-bar-webpack-plugin');

const cleanOptions = {
    root: path.resolve(__dirname, './dist'),
    verbose: true,
    dry: false
};

const webpackConfig = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: 'webgl-[name].js'
    },
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: path.resolve(__dirname, './dist'),
        compress: true,
        port: 3000
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: { minimize: true }
                    }
                ]
            },
            {
                test: /\.(png|gif|svg|xml|jpe?g|JPG|obj|mtl|ply)$/,
                use: ['url-loader']
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, './public/index.html')
        }),
        new CleanWebpackPlugin(['*'], cleanOptions),
        new ProgressBarWebpackPlugin()
    ]
}

module.exports = webpackConfig;
