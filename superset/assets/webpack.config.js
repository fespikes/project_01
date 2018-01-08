const webpack = require('webpack');
const path = require('path');
// const fs = require('fs');
const ManifestPlugin = require('webpack-manifest-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

// input dir
const APP_DIR = path.resolve(__dirname, './');

// output dir
const BUILD_DIR = path.resolve(__dirname, './dist');

const config = {
    node: {
        fs: 'empty',
    },
    entry: {
        'css-theme': APP_DIR + '/javascripts/css-theme.js',

        user: ['babel-polyfill', APP_DIR + '/javascripts/user.js'],
        home: ['babel-polyfill', APP_DIR + '/javascripts/home.js'],
        sliceList: ['babel-polyfill', APP_DIR + '/javascripts/sliceList.js'],
        databaseList: ['babel-polyfill', APP_DIR + '/javascripts/databaseList.js'],
        tableList: ['babel-polyfill', APP_DIR + '/javascripts/tableList.js'],
        hdfsList: ['babel-polyfill', APP_DIR + '/javascripts/hdfsList.js'],
        dashboardEntry: ['babel-polyfill', APP_DIR + '/javascripts/dashboardEntry.js'],

        common: APP_DIR + '/javascripts/common.js',
        dashboard: ['babel-polyfill', APP_DIR + '/javascripts/dashboard/Dashboard.jsx'],
        explore: ['babel-polyfill', APP_DIR + '/javascripts/explore/explore.jsx'],
        explorev2: ['babel-polyfill', APP_DIR + '/javascripts/explorev2/index.jsx'],
        sqllab: ['babel-polyfill', APP_DIR + '/javascripts/SqlLab/index.jsx'],
        standalone: ['babel-polyfill', APP_DIR + '/javascripts/standalone.js'],
        welcome: ['babel-polyfill', APP_DIR + '/javascripts/welcome.js'],
        profile: ['babel-polyfill', APP_DIR + '/javascripts/profile/index.jsx'],
    },
    output: {
        path: BUILD_DIR,
        filename: '[name].[chunkhash].entry.js',
        chunkFilename: '[name].[chunkhash].entry.js',
    },
    resolve: {
        extensions: [
            '.js',
            '.jsx',
        ],
        alias: {
            webworkify: 'webworkify-webpack',

            //TODO: below config change
            'mapbox-gl/js/geo/transform': path.join(
                __dirname, '/node_modules/mapbox-gl/js/geo/transform'),
            'mapbox-gl': path.join(__dirname, '/node_modules/mapbox-gl/dist/mapbox-gl.js'),
        }
    },
    module: {
        noParse: /mapbox-gl\/dist/,
        loaders: [
            {
                test: /\.scss$/,
                loaders: ["style-loader", "css-loader", "sass-loader"]
            },

            {
                test: /datatables\.net.*/,
                loader: 'imports-loader?define=>false',
            },
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: [
                        'airbnb',
                        'env',
                        'stage-0',
                    ],
                }
            },
            /* for react-map-gl overlays */
            {
                test: /\.react\.js$/,
                include: APP_DIR + '/node_modules/react-map-gl/src/overlays',
                loader: 'babel',
            },
            /* for require('*.css') */
            {
                test: /\.css$/,
                include: APP_DIR,
                loader: ExtractTextPlugin.extract({
                    use: ['css-loader'],
                    fallback: 'style-loader',
                })
            },
            // Optionally extract less files
            // or any other compile-to-css language
            {
                test: /\.less$/,
                include: APP_DIR,
                loader: ExtractTextPlugin.extract({
                    use: ['css-loader', 'less-loader'],
                    fallback: 'style-loader',
                }),
            },
            /* for css linking images */
            /*            {
                            test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
                            loader: "url-loader?limit=8192&name=img/[name].[hash:8].[ext]"
                        },*/
            {
                test: /\.png$/,
                loader: 'url-loader?limit=5000000',
            },
            {
                test: /\.jpg$/,
                loader: 'file-loader',
            },
            {
                test: /\.gif$/,
                loader: 'file-loader',
            },
            /* for font-awesome */
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'url-loader?limit=10000&minetype=application/font-woff',
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file-loader',
            },

            /* for mapbox */
            {
                test: /\.json$/,
                loader: 'json-loader',
            },
            {
                test: /\.js$/,
                include: APP_DIR + '/node_modules/mapbox-gl/js/render/painter/use_program.js',
                loader: 'transform/cacheable?brfs',
            },
        ]

    /*postLoaders: [{
        include: /node_modules\/mapbox-gl/,
        loader: 'transform',
        query: 'brfs',
    }],*/
    },
    externals: {
        cheerio: 'window',
        'react/lib/ExecutionEnvironment': true,
        'react/lib/ReactContext': true,
    // xmlhttprequest: '{XMLHttpRequest:XMLHttpRequest}'
    },
    plugins: [
        new ManifestPlugin(),
        new CleanWebpackPlugin(['dist']),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(process.env.NODE_ENV),
            },
        }),
        new ExtractTextPlugin('[name].[chunkhash].css')
    ],
};

if (process.env.NODE_ENV === 'production') {
    // Using settings suggested in https://github.com/webpack/webpack/issues/537
    const UJSplugin = new webpack.optimize.UglifyJsPlugin({
        sourceMap: false,
        minimize: true,
        parallel: {
            cache: true,
            workers: 4,
        },
        compress: false,
    });
    config.plugins.push(UJSplugin);
}
module.exports = config;
