const path = require('path');
const webpack = require('webpack');
const Visualizer = require('webpack-visualizer-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const InlineManifestWebpackPlugin = require('inline-manifest-webpack-plugin');
//
const {getIfUtils, removeEmpty} = require('webpack-config-utils');
const dotenv = require('dotenv').config({path: __dirname + '/.env', systemvars: true});
const {ifProduction, ifNotProduction, ifDevelopment} = getIfUtils(process.env);

const directory = process.env.ROOT_PATH === undefined || process.env.ROOT_PATH === '/' ? '/' : `/${process.env.ROOT_PATH}/`;
const server = `http://${dotenv.parsed.APP_WEBPACK_HOST}:${dotenv.parsed.APP_WEBPACK_PORT}`;

const defineVars = () => {
    const env = dotenv.parsed;
    const output = {};

    output['NODE_ENV'] = ifProduction('"production"', '"development"');

    Object
        .keys(env)
        .forEach(key => {
            if (key.startsWith('APP_')) {
                output[key] = `"${env[key] || ''}"`
            }
        });

    return output;
}

module.exports = {
    mode: ifProduction('production', 'development'),
    entry: {
        main: removeEmpty([
            "@babel/polyfill",
            // fix HMR in IE
            ifDevelopment('eventsource-polyfill'),
            // bundle the client for webpack-dev-server
            // and connect to the provided endpoint
            // it enable HMR from external devices
            ifDevelopment(`webpack-dev-server/client?${server}`),
            "./src/index.js"
        ]),
    },
    devtool: ifDevelopment("cheap-module-source-map", false),
    devServer: {
        disableHostCheck: true,
        host: dotenv.parsed.APP_WEBPACK_HOST,
        port: dotenv.parsed.APP_WEBPACK_PORT,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        historyApiFallback: true,
        overlay: true,
        compress: true,
        hot: ifDevelopment(true, false),
        publicPath: ifProduction('/', server),
        contentBase: path.resolve(__dirname, 'src/public'),
        watchContentBase: true,
    },
    output: {
        publicPath: ifDevelopment(server, directory),
        filename: ifProduction('assets/js/[name].[chunkhash:8].js', '[name].js'),
        chunkFilename: ifProduction('assets/js/[name].[chunkhash:8].js', '[name].js'),
        path: path.resolve(__dirname, 'build'),
        pathinfo: ifNotProduction()
    },
    resolve: {
        extensions: ['.js', '.jsx'],
        modules: ['node_modules']
    },
    optimization: {
        runtimeChunk: "single",
        splitChunks: {
            automaticNameDelimiter: '.',
            cacheGroups: {
                vendors: {
                    name: "vendors",
                    test: /[\\/]node_modules[\\/]/,
                    chunks: "initial",
                    priority: -10,
                    enforce: true,
                    reuseExistingChunk: true
                },
                main: {
                    name: "main",
                    test: /[\\/]src[\\/]/,
                    chunks: "async",
                    priority: -20,
                    minSize: 30000,
                    maxSize: 90000,
                    minChunks: 1,
                    maxAsyncRequests: 5,
                    maxInitialRequests: 3,
                    reuseExistingChunk: true
                },
                default: false
            }
        },
        minimize: ifProduction(true, false),
        minimizer: [
            new UglifyJsPlugin({
                parallel: true,
                sourceMap: true,
                exclude: /\/node_modules/,
                uglifyOptions: {
                    mangle: true,
                    compress: {
                        sequences: true,
                        dead_code: true,
                        conditionals: true,
                        booleans: true,
                        unused: true,
                        if_return: true,
                        join_vars: true,
                        drop_console: true,
                        drop_debugger: true,
                    },
                    output: {
                        comments: false,
                        beautify: false
                    }
                },
            })
        ],
    },
    module: {
        rules: [{
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: ifNotProduction()
                    }
                }],
            },
            {
                test: /\.(sc|c)ss$/,
                exclude: /node_modules/,
                use: removeEmpty([
                    ifProduction(MiniCssExtractPlugin.loader),
                    ifNotProduction("style-loader"),
                    "css-loader",
                    "sass-loader",
                ]),
            },
            {
                test: /\.(png|jpe?g|gif)(\?.*)?$/,
                use: [{
                    loader: "file-loader",
                    options: {
                        name: ifProduction('assets/images/[name].[hash:8].[ext]', '[name].[ext]')
                    }
                }]
            },
            {
                test: /\.svg(\?v=\d+.\d+.\d+)?$/,
                use: [{
                    loader: "url-loader",
                    options: {
                        limit: 10000,
                        mimetype: "image/svg+xml",
                        name: ifProduction('assets/svg/[name].[hash:8].[ext]', '[name].[ext]')
                    }
                }],
            },
            {
                test: /\.eot(\?.*)?$/,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        mimetype: 'application/vnd.ms-fontobject',
                        name: ifProduction('assets/fonts/[name].[hash:8].[ext]', '[name].[ext]')
                    }
                }],
            },
            {
                test: /\.otf(\?.*)?$/,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        mimetype: 'font/opentype',
                        name: ifProduction('assets/fonts/[name].[hash:8].[ext]', '[name].[ext]')
                    }
                }]
            },
            {
                test: /\.ttf(\?v=\d+.\d+.\d+)?$/,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        mimetype: 'application/octet-stream',
                        name: ifProduction('assets/fonts/[name].[hash:8].[ext]', '[name].[ext]')
                    }
                }],
            },
            {
                test: /\.woff(\?.*)?$/,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        mimetype: 'application/font-woff',
                        name: ifProduction('assets/fonts/[name].[hash:8].[ext]', '[name].[ext]')
                    }
                }],
            },
            {
                test: /\.woff2(\?.*)?$/,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        mimetype: 'application/font-woff2',
                        name: ifProduction('assets/fonts/[name].[hash:8].[ext]', '[name].[ext]')
                    }
                }],
            }
        ],
    },
    plugins: removeEmpty([
        // share some system and env vars with the build
        new webpack.DefinePlugin(defineVars()),
        new webpack.LoaderOptionsPlugin({
            minimize: ifProduction(),
            debug: ifNotProduction(),
        }),
        ifDevelopment(new webpack.HotModuleReplacementPlugin()),
        // allow hot module replacement
        ifDevelopment(new webpack.HashedModuleIdsPlugin()),
        // show some statistic
        ifDevelopment(new Visualizer({
            filename: path.resolve(__dirname, 'src/public/statistics.html')
        })),
        // html optimization and minification
        new HtmlWebpackPlugin({
            chunksSortMode: 'dependency',
            inject: true,
            template: path.resolve(__dirname, 'src/public/index.html'),
            favicon: path.resolve(__dirname, 'src/public/favicon.ico'),
            minify: ifProduction({
                collapseWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true
            })
        }),
        // css optimization and minification
        new MiniCssExtractPlugin({
            filename: "style.[contenthash].css"
        }),
        new OptimizeCssAssetsPlugin(),
        new CopyWebpackPlugin([{
            from: path.resolve(__dirname, 'src/public/assets'),
            to: path.resolve(__dirname, 'build/assets'),
        }, ]),
        ifProduction(new InlineManifestWebpackPlugin())
    ])
};