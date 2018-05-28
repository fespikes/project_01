const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const APP_DIR = path.resolve(__dirname, './'); // input dir
const BUILD_DIR = path.resolve(__dirname, './dist'); // output dir
const VERSION_STRING = JSON.parse(fs.readFileSync('package.json')).version;

module.exports = {
    /*node: {
        fs: "empty"
    },*/
    target: 'node',
    entry: {
        'css-theme': APP_DIR + '/javascripts/css-theme.js',

        // user: ['babel-polyfill', APP_DIR + '/javascripts/user.js'],
        // home: ['babel-polyfill', APP_DIR + '/javascripts/home.js'],
        // sliceList: ['babel-polyfill', APP_DIR + '/javascripts/sliceList.js'],
        // databaseList: ['babel-polyfill', APP_DIR + '/javascripts/databaseList.js'],
        // tableList: ['babel-polyfill', APP_DIR + '/javascripts/tableList.js'],
        // hdfsList: ['babel-polyfill', APP_DIR + '/javascripts/hdfsList.js'],
        // dashboardEntry: ['babel-polyfill', APP_DIR + '/javascripts/dashboardEntry.js'],

    // common: APP_DIR + '/javascripts/common.js',
    // dashboard: ['babel-polyfill', APP_DIR + '/javascripts/dashboard/Dashboard.jsx'],
    // explore: ['babel-polyfill', APP_DIR + '/javascripts/explore/explore.jsx'],
    // explorev2: ['babel-polyfill', APP_DIR + '/javascripts/explorev2/index.jsx'],
    // sqllab: ['babel-polyfill', APP_DIR + '/javascripts/SqlLab/index.jsx'],
    // standalone: ['babel-polyfill', APP_DIR + '/javascripts/standalone.js'],
    // welcome: APP_DIR + '/javascripts/welcome.js',
    // profile: APP_DIR + '/javascripts/profile/index.jsx'
    },
    output: {
        path: BUILD_DIR,
        filename: `[name].${VERSION_STRING}.entry.js`,
    },
    resolve: {
        extensions: ['.js', '.jsx', 'ts', 'tsx'],
        alias: {
            'mapbox-gl': path.join(__dirname, '/node_modules/mapbox-gl/dist/mapbox-gl.js')
        }
    },
    module: {
        noParse: /mapbox-gl\/dist/,
        rules: [
            // style
            {
                test: /datatables\.net.*/,
                use: 'imports-loader?define=>false',
            },
            // {
            //     test: /datatables\.net.*/,
            //     loader: 'imports-loader?define=>false',
            // },
            {
                test: /\.css$/,
                include: APP_DIR,
                use: 'style-loader, css-loader',
            },
            {
                test: /\.(scss|sass)$/,
                use: [
                    "style-loader", // creates style nodes from JS strings
                    "css-loader", // translates CSS into CommonJS
                    "sass-loader" // compiles Sass to CSS
                ]
            },
            /*{
                test: /\.less$/,
                include: APP_DIR,
                use: [{
                    loader: 'style-loader'
                }, {
                    loader: 'css-loader'
                }, {
                    loader: 'less-loader',
                    options: {
                        strictMath: true,
                        noIeCompat: true
                    }
                }]
            }, */
            {
                test: /\.less$/,
                use: [{
                    loader: 'style-loader'
                }, {
                    loader: 'css-loader'
                }, {
                    loader: 'less-loader'
                }]
            },
            // {
            //   test: /\.less$/,
            //   include: APP_DIR,
            //   loader: ExtractTextPlugin.extract({
            //     use: ['css-loader', 'less-loader'],
            //     fallback: 'style-loader',
            //   }),
            // },

            // images
            /* for css linking images */
            {
                test: /\.png$/,
                use: {
                    loader: 'url-loader?limit=1024&name=[path][name].[hash:8].[ext]',
                    options: {
                        limit: 20000
                    }
                }
            },
            {
                test: /\.(svg|jpg|gif)$/,
                use: ['file-loader'],
            },
            /* for mapbox */
            {
                test: /\.js$/,
                include: APP_DIR + '/node_modules/mapbox-gl/js/render/painter/use_program.js',
                use: {
                    loader: 'transform/cacheable?brfs'
                }
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['babel-preset-airbnb', 'babel-preset-env', 'babel-preset-airbnb', 'babel-preset-react']
                    }
                }
            },

            // {
            //     test: /\.jsx?$/,
            //     exclude: APP_DIR + '/node_modules',
            //     loader: 'babel',
            //     query: {
            //         presets: [
            //             'airbnb',
            //             'es2015',
            //             'react', 'stage-0'
            //         ],
            //     },
            // },

            /* for react-map-gl overlays */
            {
                test: /\.react\.js$/,
                include: APP_DIR + '/node_modules/react-map-gl/src/overlays',
                use: ['babel-loader'],
            },
            // {
            //     test: /\.react\.js$/,
            //     include: APP_DIR + '/node_modules/react-map-gl/src/overlays',
            //     loader: 'babel',
            // },
            {
                test: /\.(ts|tsx)$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },

            /* for font-awesome */
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: 'url-loader?limit=10000&minetype=application/font-woff'
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: 'file-loader'
            }
        ] /*,
        postLoaders: [{
            include: /node_modules\/mapbox-gl/,
            loader: 'transform',
            query: 'brfs',
        }],*/
    },
    externals: {
        cheerio: 'window',
        'react/lib/ExecutionEnvironment': true,
        'react/lib/ReactContext': true,
        xmlhttprequest: '{XMLHttpRequest:XMLHttpRequest}'
    },
    plugins: [
        new CleanWebpackPlugin(['dist/']),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(process.env.NODE_ENV),
            },
        })
    // new MiniCssExtractPlugin({
    //     // Options similar to the same options in webpackOptions.output
    //     // both options are optional
    //     filename: "[name].css",
    //     chunkFilename: "[id].css"
    // })
    ],
};
