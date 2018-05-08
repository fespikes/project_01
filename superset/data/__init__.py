"""Loads datasets, dashboards and slices in a new superset instance"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import gzip
import json
import os
import textwrap
import datetime
import random
import logging

import pandas as pd
from sqlalchemy import String, DateTime, Date, Float, BigInteger, Integer

from superset import app, db, models, utils
from superset.security import get_or_create_main_db

# Shortcuts
DB = models.Database
Slice = models.Slice
TBL = models.Dataset
Dash = models.Dashboard
Log = models.Log

config = app.config

DATA_FOLDER = os.path.join(config.get("BASE_DIR"), 'data')

misc_dash_slices = []  # slices assembled in a "Misc Chart" dashboard


def merge_slice(slc, user_id=None):
    o = db.session.query(Slice).filter_by(slice_name=slc.slice_name).first()
    if o:
        db.session.delete(o)
        Log.log_delete(o, 'slice', user_id)
    db.session.add(slc)
    db.session.commit()
    Log.log_add(slc, 'slice', user_id)


def get_slice_json(defaults, **kwargs):
    d = defaults.copy()
    d.update(kwargs)
    return json.dumps(d, indent=4, sort_keys=True)


def load_energy(user_id=None):
    """Loads an energy related dataset to use with sankey and graphs"""
    tbl_name = 'energy_usage'
    logging.info("Loading data into table [energy_usage]")
    with gzip.open(os.path.join(DATA_FOLDER, 'energy.json.gz')) as f:
        pdf = pd.read_json(f)
    pdf.to_sql(
        tbl_name,
        db.engine,
        if_exists='replace',
        chunksize=500,
        dtype={
            'source': String(255),
            'target': String(255),
            'value': Float(),
        },
        index=False)

    logging.info("Creating dataset [energy_usage]")
    tbl = db.session.query(TBL).filter_by(table_name=tbl_name).first()
    if not tbl:
        tbl = TBL(dataset_name="能源消耗",
                  table_name=tbl_name)
    tbl.description = "Energy consumption"
    tbl.online = True
    tbl.database = get_or_create_main_db()
    tbl.created_by_fk = user_id
    db.session.merge(tbl)
    db.session.commit()
    Log.log_add(tbl, 'dataset', user_id)
    tbl.fetch_metadata()

    slc = Slice(
        slice_name="能源使用的细分",
        viz_type='sankey',
        datasource_type='table',
        datasource_id=tbl.id,
        params=textwrap.dedent("""\
        {
            "collapsed_fieldsets": "",
            "datasource_id": "3",
            "datasource_name": "energy_usage",
            "datasource_type": "table",
            "flt_col_0": "source",
            "flt_eq_0": "",
            "flt_op_0": "in",
            "groupby": [
                "source",
                "target"
            ],
            "having": "",
            "metric": "sum__value",
            "row_limit": "5000",
            "slice_name": "Energy Sankey",
            "viz_type": "sankey",
            "where": ""
        }
        """),
        online=True,
        created_by_fk=user_id
    )
    misc_dash_slices.append(slc.slice_name)
    merge_slice(slc, user_id=user_id)

    slc = Slice(
        slice_name="能源流动",
        viz_type='directed_force',
        datasource_type='table',
        datasource_id=tbl.id,
        params=textwrap.dedent("""\
        {
            "charge": "-500",
            "collapsed_fieldsets": "",
            "datasource_id": "1",
            "datasource_name": "energy_usage",
            "datasource_type": "table",
            "flt_col_0": "source",
            "flt_eq_0": "",
            "flt_op_0": "in",
            "groupby": [
                "source",
                "target"
            ],
            "having": "",
            "link_length": "200",
            "metric": "sum__value",
            "row_limit": "5000",
            "slice_name": "Force",
            "viz_type": "directed_force",
            "where": ""
        }
        """),
        online=True,
        created_by_fk=user_id
    )
    misc_dash_slices.append(slc.slice_name)
    merge_slice(slc, user_id=user_id)

    slc = Slice(
        slice_name="能源热力图",
        viz_type='heatmap',
        datasource_type='table',
        datasource_id=tbl.id,
        params=textwrap.dedent("""\
        {
            "all_columns_x": "source",
            "all_columns_y": "target",
            "canvas_image_rendering": "pixelated",
            "collapsed_fieldsets": "",
            "datasource_id": "1",
            "datasource_name": "energy_usage",
            "datasource_type": "table",
            "flt_col_0": "source",
            "flt_eq_0": "",
            "flt_op_0": "in",
            "having": "",
            "linear_color_scheme": "blue_white_yellow",
            "metric": "sum__value",
            "normalize_across": "heatmap",
            "slice_name": "Heatmap",
            "viz_type": "heatmap",
            "where": "",
            "xscale_interval": "1",
            "yscale_interval": "1"
        }
        """),
        online=True,
        created_by_fk=user_id
    )
    misc_dash_slices.append(slc.slice_name)
    merge_slice(slc, user_id=user_id)


def load_world_bank_health_n_pop(user_id=None):
    """Loads the world bank health dataset, slices and a dashboard"""
    tbl_name = 'wb_health_population'
    logging.info("Loading data into table [wb_health_population]")
    with gzip.open(os.path.join(DATA_FOLDER, 'countries.json.gz')) as f:
        pdf = pd.read_json(f)
    pdf.columns = [col.replace('.', '_') for col in pdf.columns]
    pdf.year = pd.to_datetime(pdf.year)
    pdf.to_sql(
        tbl_name,
        db.engine,
        if_exists='replace',
        chunksize=50,
        dtype={
            'year': DateTime(),
            'country_code': String(3),
            'country_name': String(255),
            'region': String(255),
        },
        index=False)

    logging.info("Creating dataset [wb_health_population]")
    tbl = db.session.query(TBL).filter_by(table_name=tbl_name).first()
    if not tbl:
        tbl = TBL(dataset_name='世界各国人口',
                  table_name=tbl_name)
    tbl.description = utils.readfile(os.path.join(DATA_FOLDER, 'countries.md'))
    tbl.main_dttm_col = 'year'
    tbl.online = True
    tbl.database = get_or_create_main_db()
    tbl.created_by_fk = user_id
    db.session.merge(tbl)
    db.session.commit()
    Log.log_add(tbl, 'dataset', user_id)
    tbl.fetch_metadata()

    defaults = {
        "compare_lag": "10",
        "compare_suffix": "o10Y",
        "datasource_id": "1",
        "datasource_name": "birth_names",
        "datasource_type": "table",
        "limit": "25",
        "granularity": "year",
        "groupby": [],
        "metric": 'sum__SP_POP_TOTL',
        "metrics": ["sum__SP_POP_TOTL"],
        "row_limit": config.get("SLICE_ROW_LIMIT"),
        "since": "2014-01-01",
        "until": "2014-01-02",
        "where": "",
        "markup_type": "markdown",
        "country_fieldtype": "cca3",
        "secondary_metric": "sum__SP_POP_TOTL",
        "entity": "country_code",
        "show_bubbles": "y",
    }

    logging.info("Creating slices")
    slices = [
        Slice(
            slice_name="筛选地区",
            viz_type='filter_box',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type='filter_box',
                groupby=['region', 'country_name']),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="世界人口",
            viz_type='big_number',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                since='2000',
                viz_type='big_number',
                compare_lag="10",
                metric='sum__SP_POP_TOTL',
                compare_suffix="over 10Y"),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="人口数量排行",
            viz_type='table',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type='table',
                metrics=["sum__SP_POP_TOTL"],
                groupby=['country_name']),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="人口增长变化",
            viz_type='line',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type='line',
                since="1960-01-01",
                metrics=["sum__SP_POP_TOTL"],
                num_period_compare="10",
                groupby=['country_name']),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="各国人口",
            viz_type='world_map',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type='world_map',
                metric="sum__SP_RUR_TOTL_ZS",
                num_period_compare="10"),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="各洲预期寿命",
            viz_type='bubble',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type='bubble',
                since="2011-01-01",
                until="2011-01-02",
                series="region",
                limit="0",
                entity="country_name",
                x="sum__SP_RUR_TOTL_ZS",
                y="sum__SP_DYN_LE00_IN",
                size="sum__SP_POP_TOTL",
                max_bubble_size="50",
                flt_col_1="country_code",
                flt_op_1="not in",
                flt_eq_1="TCA,MNP,DMA,MHL,MCO,SXM,CYM,TUV,IMY,KNA,ASM,ADO,AMA,PLW",
                num_period_compare="10",),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="各洲与各国人口",
            viz_type='sunburst',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type='sunburst',
                groupby=["region", "country_name"],
                secondary_metric="sum__SP_RUR_TOTL",
                since="2011-01-01",
                until="2011-01-01",),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="东亚人口变化趋势",
            viz_type='area',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                since="1960-01-01",
                until="now",
                viz_type='area',
                groupby=["region"],),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="东亚人口数量箱线图",
            viz_type='box_plot',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                since="1960-01-01",
                until="now",
                whisker_options="Min/max (no outliers)",
                viz_type='box_plot',
                groupby=["region"],),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="各洲人口树状图",
            viz_type='treemap',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                since="1960-01-01",
                until="now",
                viz_type='treemap',
                metrics=["sum__SP_POP_TOTL"],
                groupby=["region", "country_code"],),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="人口数量平行坐标图",
            viz_type='para',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                since="2011-01-01",
                until="2011-01-01",
                viz_type='para',
                limit=100,
                metrics=[
                    "sum__SP_POP_TOTL",
                    'sum__SP_RUR_TOTL_ZS',
                    'sum__SH_DYN_AIDS'],
                secondary_metric='sum__SP_POP_TOTL',
                series="country_name",),
            online=True,
            created_by_fk=user_id),
    ]
    misc_dash_slices.append(slices[-1].slice_name)
    for slc in slices:
        merge_slice(slc, user_id=user_id)

    logging.info("Creating dashboard [世界人口]")
    dash_name = "世界人口"
    slug = "world_health"
    dash = db.session.query(Dash).filter_by(slug=slug).first()

    if not dash:
        dash = Dash()
    js = textwrap.dedent("""\
    [
        {
            "col": 1,
            "row": 0,
            "size_x": 2,
            "size_y": 2,
            "slice_id": "1231"
        },
        {
            "col": 1,
            "row": 2,
            "size_x": 2,
            "size_y": 2,
            "slice_id": "1232"
        },
        {
            "col": 10,
            "row": 0,
            "size_x": 3,
            "size_y": 7,
            "slice_id": "1233"
        },
        {
            "col": 1,
            "row": 4,
            "size_x": 6,
            "size_y": 3,
            "slice_id": "1234"
        },
        {
            "col": 3,
            "row": 0,
            "size_x": 7,
            "size_y": 4,
            "slice_id": "1235"
        },
        {
            "col": 5,
            "row": 7,
            "size_x": 8,
            "size_y": 4,
            "slice_id": "1236"
        },
        {
            "col": 7,
            "row": 4,
            "size_x": 3,
            "size_y": 3,
            "slice_id": "1237"
        },
        {
            "col": 1,
            "row": 7,
            "size_x": 4,
            "size_y": 4,
            "slice_id": "1238"
        },
        {
            "col": 9,
            "row": 11,
            "size_x": 4,
            "size_y": 4,
            "slice_id": "1239"
        },
        {
            "col": 1,
            "row": 11,
            "size_x": 8,
            "size_y": 4,
            "slice_id": "1240"
        }
    ]
    """)
    l = json.loads(js)
    for i, pos in enumerate(l):
        pos['slice_id'] = str(slices[i].id)

    dash.name = dash_name
    dash.position_json = json.dumps(l, indent=4)
    dash.online = True
    dash.slices = slices[:-1]
    dash.created_by_fk = user_id
    db.session.merge(dash)
    db.session.commit()
    Log.log_add(dash, 'dashboard', user_id)


def load_css_templates(user_id=None):
    """Loads 2 css templates to demonstrate the feature"""
    logging.info('Creating default CSS templates')
    CSS = models.CssTemplate  # noqa

    obj = db.session.query(CSS).filter_by(template_name='Flat').first()
    if not obj:
        obj = CSS(template_name="Flat")
    css = textwrap.dedent("""\
    .gridster div.widget {
        transition: background-color 0.5s ease;
        background-color: #FAFAFA;
        border: 1px solid #CCC;
        box-shadow: none;
        border-radius: 0px;
    }
    .gridster div.widget:hover {
        border: 1px solid #000;
        background-color: #EAEAEA;
    }
    .navbar {
        transition: opacity 0.5s ease;
        opacity: 0.05;
    }
    .navbar:hover {
        opacity: 1;
    }
    .chart-header .header{
        font-weight: normal;
        font-size: 12px;
    }
    /*
    var bnbColors = [
        //rausch    hackb      kazan      babu      lima        beach     tirol
        '#ff5a5f', '#7b0051', '#007A87', '#00d1c1', '#8ce071', '#ffb400', '#b4a76c',
        '#ff8083', '#cc0086', '#00a1b3', '#00ffeb', '#bbedab', '#ffd266', '#cbc29a',
        '#ff3339', '#ff1ab1', '#005c66', '#00b3a5', '#55d12e', '#b37e00', '#988b4e',
     ];
    */
    """)
    obj.css = css
    db.session.merge(obj)
    db.session.commit()

    obj = (
        db.session.query(CSS).filter_by(template_name='Courier Black').first())
    if not obj:
        obj = CSS(template_name="Courier Black")
    css = textwrap.dedent("""\
    .gridster div.widget {
        transition: background-color 0.5s ease;
        background-color: #EEE;
        border: 2px solid #444;
        border-radius: 15px;
        box-shadow: none;
    }
    h2 {
        color: white;
        font-size: 52px;
    }
    .navbar {
        box-shadow: none;
    }
    .gridster div.widget:hover {
        border: 2px solid #000;
        background-color: #EAEAEA;
    }
    .navbar {
        transition: opacity 0.5s ease;
        opacity: 0.05;
    }
    .navbar:hover {
        opacity: 1;
    }
    .chart-header .header{
        font-weight: normal;
        font-size: 12px;
    }
    .nvd3 text {
        font-size: 12px;
        font-family: inherit;
    }
    body{
        background: #000;
        font-family: Courier, Monaco, monospace;;
    }
    /*
    var bnbColors = [
        //rausch    hackb      kazan      babu      lima        beach     tirol
        '#ff5a5f', '#7b0051', '#007A87', '#00d1c1', '#8ce071', '#ffb400', '#b4a76c',
        '#ff8083', '#cc0086', '#00a1b3', '#00ffeb', '#bbedab', '#ffd266', '#cbc29a',
        '#ff3339', '#ff1ab1', '#005c66', '#00b3a5', '#55d12e', '#b37e00', '#988b4e',
     ];
    */
    """)
    obj.css = css
    db.session.merge(obj)
    db.session.commit()


def load_birth_names(user_id=None):
    """Loading birth name dataset from a zip file in the repo"""
    logging.info("Loading data into table [birth_names]")
    with gzip.open(os.path.join(DATA_FOLDER, 'birth_names.json.gz')) as f:
        pdf = pd.read_json(f)
    pdf.ds = pd.to_datetime(pdf.ds, unit='ms')
    pdf.to_sql(
        'birth_names',
        db.engine,
        if_exists='replace',
        chunksize=500,
        dtype={
            'ds': DateTime,
            'gender': String(16),
            'state': String(10),
            'name': String(255),
        },
        index=False)

    logging.info("Creating dataset [birth_names]")
    obj = db.session.query(TBL).filter_by(table_name='birth_names').first()
    if not obj:
        obj = TBL(dataset_name='新生婴儿统计',
                  table_name='birth_names')
    obj.main_dttm_col = 'ds'
    obj.database = get_or_create_main_db()
    obj.online = True
    obj.created_by_fk = user_id
    db.session.merge(obj)
    db.session.commit()
    Log.log_add(obj, 'dataset', user_id)
    obj.fetch_metadata()
    tbl = obj

    defaults = {
        "compare_lag": "10",
        "compare_suffix": "o10Y",
        "datasource_id": "1",
        "datasource_name": "birth_names",
        "datasource_type": "table",
        "flt_op_1": "in",
        "limit": "25",
        "granularity": "ds",
        "groupby": [],
        "metric": 'sum__num',
        "metrics": ["sum__num"],
        "row_limit": config.get("SLICE_ROW_LIMIT"),
        "since": "100 years ago",
        "until": "now",
        "viz_type": "table",
        "where": "",
        "markup_type": "markdown",
    }

    logging.info("Creating slices")
    slices = [
        Slice(
            slice_name="女孩姓名数量",
            viz_type='table',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                groupby=['name'],
                flt_col_1='gender',
                flt_eq_1="girl", row_limit=50),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="男孩姓名数量",
            viz_type='table',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                groupby=['name'],
                flt_col_1='gender',
                flt_eq_1="boy",
                row_limit=50),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="每年新生婴儿趋势图",
            viz_type='big_number',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type="big_number", granularity="ds",
                compare_lag="5", compare_suffix="over 5Y"),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="性别比例",
            viz_type='pie',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type="pie", groupby=['gender']),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="各州男女婴儿数量",
            viz_type='dist_bar',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                flt_eq_1="other", viz_type="dist_bar",
                metrics=['sum__sum_girls', 'sum__sum_boys'],
                groupby=['state'], flt_op_1='not in', flt_col_1='state'),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="每年名字数量趋势",
            viz_type='line',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type="line", groupby=['name'],
                granularity='ds', rich_tooltip='y', show_legend='y'),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="每年平均数量和总数的对比",
            viz_type='dual_line',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type="dual_line", metric='avg__num', metric_2='sum__num',
                granularity='ds'),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="标题",
            viz_type='markup',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type="markup", markup_type="html",
                code="""\
<div style="text-align:center">
    <h1>Birth Names Dashboard</h1>
    <p>
        The source dataset came from
        <a href="https://github.com/hadley/babynames">[here]</a>
    </p>
    <img src="/static/assets/images/babytux.jpg">
</div>
"""),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="热门名字",
            viz_type='word_cloud',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type="word_cloud", size_from="10",
                series='name', size_to="70", rotation="square",
                limit='100'),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="各州名字统计",
            viz_type='pivot_table',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type="pivot_table", metrics=['sum__num'],
                groupby=['name'], columns=['state']),
            online=True,
            created_by_fk=user_id),
        Slice(
            slice_name="女孩总数",
            viz_type='big_number_total',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(
                defaults,
                viz_type="big_number_total", granularity="ds",
                flt_col_1='gender', flt_eq_1='girl',
                subheader='total female participants'),
            online=True,
            created_by_fk=user_id),
    ]
    for slc in slices:
        merge_slice(slc, user_id=user_id)

    logging.info("Creating dashboard [新生婴儿]")
    dash = db.session.query(Dash).filter_by(name="Births").first()

    if not dash:
        dash = Dash()
    js = textwrap.dedent("""\
    [
        {
            "col": 9,
            "row": 6,
            "size_x": 2,
            "size_y": 4,
            "slice_id": "1267"
        },
        {
            "col": 11,
            "row": 6,
            "size_x": 2,
            "size_y": 4,
            "slice_id": "1268"
        },
        {
            "col": 1,
            "row": 0,
            "size_x": 2,
            "size_y": 2,
            "slice_id": "1269"
        },
        {
            "col": 3,
            "row": 0,
            "size_x": 2,
            "size_y": 2,
            "slice_id": "1270"
        },
        {
            "col": 5,
            "row": 3,
            "size_x": 8,
            "size_y": 3,
            "slice_id": "1271"
        },
        {
            "col": 1,
            "row": 6,
            "size_x": 8,
            "size_y": 4,
            "slice_id": "1272"
        },
        {
            "col": 10,
            "row": 0,
            "size_x": 3,
            "size_y": 3,
            "slice_id": "1273"
        },
        {
            "col": 5,
            "row": 0,
            "size_x": 5,
            "size_y": 3,
            "slice_id": "1274"
        },
        {
            "col": 1,
            "row": 2,
            "size_x": 4,
            "size_y": 4,
            "slice_id": "1275"
        }
    ]
        """)
    l = json.loads(js)
    for i, pos in enumerate(l):
        pos['slice_id'] = str(slices[i].id)
    dash.name = "新生婴儿"
    dash.position_json = json.dumps(l, indent=4)
    dash.online = True
    dash.slices = slices[:-1]
    dash.created_by_fk = user_id
    db.session.merge(dash)
    db.session.commit()
    Log.log_add(dash, 'dashboard', user_id)


def load_unicode_test_data(user_id=None):
    """Loading unicode test dataset from a csv file in the repo"""
    logging.info("Loading data into table [unicode_test]")
    df = pd.read_csv(os.path.join(DATA_FOLDER, 'unicode_utf8_unixnl_test.csv'),
                     encoding="utf-8")
    # generate date/numeric data
    df['date'] = datetime.datetime.now().date()
    df['value'] = [random.randint(1, 100) for _ in range(len(df))]
    df.to_sql(
        'unicode_test',
        db.engine,
        if_exists='replace',
        chunksize=500,
        dtype={
            'phrase': String(500),
            'short_phrase': String(10),
            'with_missing': String(100),
            'date': Date(),
            'value': Float(),
        },
        index=False)

    logging.info("Creating dataset [unicode_test]")
    obj = db.session.query(TBL).filter_by(table_name='unicode_test').first()
    if not obj:
        obj = TBL(dataset_name='unicode_test',
                  table_name='unicode_test')
    obj.main_dttm_col = 'date'
    obj.database = get_or_create_main_db()
    obj.online = False
    obj.created_by_fk = user_id
    db.session.merge(obj)
    db.session.commit()
    Log.log_add(obj, 'dataset', user_id)
    obj.fetch_metadata()
    tbl = obj

    slice_data = {
        "datasource_id": "3",
        "datasource_name": "unicode_test",
        "datasource_type": "table",
        "flt_op_1": "in",
        "granularity": "date",
        "groupby": [],
        "metric": 'sum__value',
        "row_limit": config.get("SLICE_ROW_LIMIT"),
        "since": "100 years ago",
        "until": "now",
        "where": "",
        "viz_type": "word_cloud",
        "size_from": "10",
        "series": "short_phrase",
        "size_to": "70",
        "rotation": "square",
        "limit": "100",
    }

    logging.info("Creating a slice")
    slc = Slice(
        slice_name="Unicode Cloud",
        viz_type='word_cloud',
        datasource_type='table',
        datasource_id=tbl.id,
        params=get_slice_json(slice_data),
        online=True,
        created_by_fk=user_id
    )
    merge_slice(slc, user_id=user_id)

    logging.info("Creating dashboard [Unicode Test]")
    dash = (
        db.session.query(Dash)
        .filter_by(name="Unicode Test")
        .first()
    )

    if not dash:
        dash = Dash()
    pos = {
        "size_y": 4,
        "size_x": 4,
        "col": 1,
        "row": 1,
        "slice_id": slc.id,
    }
    dash.name = "Unicode Test"
    dash.position_json = json.dumps([pos], indent=4)
    dash.online = True
    dash.slices = [slc]
    dash.created_by_fk = user_id
    db.session.merge(dash)
    db.session.commit()
    Log.log_add(dash, 'dashboard', user_id)


def load_random_time_series_data(user_id=None):
    """Loading random time series data from a zip file in the repo"""
    logging.info("Loading data into table [random_time_series]")
    with gzip.open(os.path.join(DATA_FOLDER, 'random_time_series.json.gz')) as f:
        pdf = pd.read_json(f)
    pdf.ds = pd.to_datetime(pdf.ds, unit='s')
    pdf.to_sql(
        'random_time_series',
        db.engine,
        if_exists='replace',
        chunksize=500,
        dtype={
            'ds': DateTime,
        },
        index=False)

    logging.info("Creating dataset [random_time_series]")
    obj = db.session.query(TBL).filter_by(table_name='random_time_series').first()
    if not obj:
        obj = TBL(dataset_name='随机时间序列',
                  table_name='random_time_series')
    obj.main_dttm_col = 'ds'
    obj.database = get_or_create_main_db()
    obj.online = True
    obj.created_by_fk = user_id
    db.session.merge(obj)
    db.session.commit()
    Log.log_add(obj, 'dataset', user_id)
    obj.fetch_metadata()
    tbl = obj

    slice_data = {
        "datasource_id": "6",
        "datasource_name": "random_time_series",
        "datasource_type": "table",
        "granularity": "day",
        "row_limit": config.get("SLICE_ROW_LIMIT"),
        "since": "1 year ago",
        "until": "now",
        "where": "",
        "viz_type": "cal_heatmap",
        "domain_granularity": "month",
        "subdomain_granularity": "day",
    }

    logging.info("Creating a slice")
    slc = Slice(
        slice_name='热力图',
        description='基于随机时间序列数据',
        viz_type='cal_heatmap',
        datasource_type='table',
        datasource_id=tbl.id,
        params=get_slice_json(slice_data),
        online=True,
        created_by_fk=user_id
    )
    merge_slice(slc, user_id=user_id)


def load_long_lat_data(user_id=None):
    """Loading lat/long data from a csv file in the repo"""
    logging.info("Loading data into table [long_lat]")
    with gzip.open(os.path.join(DATA_FOLDER, 'san_francisco.csv.gz')) as f:
        pdf = pd.read_csv(f, encoding="utf-8")
    pdf['date'] = datetime.datetime.now().date()
    pdf['occupancy'] = [random.randint(1, 6) for _ in range(len(pdf))]
    pdf['radius_miles'] = [random.uniform(1, 3) for _ in range(len(pdf))]
    pdf.to_sql(
        'long_lat',
        db.engine,
        if_exists='replace',
        chunksize=500,
        dtype={
            'longitude': Float(),
            'latitude': Float(),
            'number': Float(),
            'street': String(100),
            'unit': String(10),
            'city': String(50),
            'district': String(50),
            'region': String(50),
            'postcode': Float(),
            'id': String(100),
            'date': Date(),
            'occupancy': Float(),
            'radius_miles': Float(),
        },
        index=False)

    logging.info("Creating dataset [long_lat]")
    obj = db.session.query(TBL).filter_by(table_name='long_lat').first()
    if not obj:
        obj = TBL(dataset_name='位置坐标',
                  table_name='long_lat')
    obj.main_dttm_col = 'date'
    obj.database = get_or_create_main_db()
    obj.online = True
    obj.created_by_fk = user_id
    db.session.merge(obj)
    db.session.commit()
    Log.log_add(obj, 'dataset', user_id)
    obj.fetch_metadata()
    tbl = obj

    slice_data = {
        "datasource_id": "7",
        "datasource_name": "long_lat",
        "datasource_type": "table",
        "granularity": "day",
        "since": "2014-01-01",
        "until": "now",
        "where": "",
        "viz_type": "mapbox",
        "all_columns_x": "LON",
        "all_columns_y": "LAT",
        "mapbox_style": "mapbox://styles/mapbox/light-v9",
        "all_columns": ["occupancy"],
        "row_limit": 500000,
    }

    logging.info("Creating a slice")
    slc = Slice(
        slice_name="地理区域数量统计",
        viz_type='mapbox',
        datasource_type='table',
        datasource_id=tbl.id,
        params=get_slice_json(slice_data),
        online=True,
        created_by_fk=user_id
    )
    misc_dash_slices.append(slc.slice_name)
    merge_slice(slc, user_id=user_id)


def load_multiformat_time_series_data(user_id=None):

    """Loading time series data from a zip file in the repo"""
    logging.info("Loading data into table [multiformat_time_series]")
    with gzip.open(os.path.join(DATA_FOLDER, 'multiformat_time_series.json.gz')) as f:
        pdf = pd.read_json(f)
    pdf.ds = pd.to_datetime(pdf.ds, unit='s')
    pdf.ds2 = pd.to_datetime(pdf.ds2, unit='s')
    pdf.to_sql(
        'multiformat_time_series',
        db.engine,
        if_exists='replace',
        chunksize=500,
        dtype={
            "ds": Date,
            'ds2': DateTime,
            "epoch_s": BigInteger,
            "epoch_ms": BigInteger,
            "string0": String(100),
            "string1": String(100),
            "string2": String(100),
            "string3": String(100),
        },
        index=False)

    logging.info("Creating dataset [multiformat_time_series]")
    obj = db.session.query(TBL).filter_by(table_name='multiformat_time_series').first()
    if not obj:
        obj = TBL(dataset_name='多种格式的时间序列',
                  table_name='multiformat_time_series')
    obj.main_dttm_col = 'ds'
    obj.database = get_or_create_main_db()
    obj.online = True
    obj.created_by_fk = user_id
    dttm_and_expr_dict = {
        'ds': [None, None],
        'ds2': [None, None],
        'epoch_s': ['epoch_s', None],
        'epoch_ms': ['epoch_ms', None],
        'string2': ['%Y%m%d-%H%M%S', None],
        'string1': ['%Y-%m-%d^%H:%M:%S', None],
        'string0': ['%Y-%m-%d %H:%M:%S.%f', None],
        'string3': ['%Y/%m/%d%H:%M:%S.%f', None],
    }
    for col in obj.columns:
        dttm_and_expr = dttm_and_expr_dict[col.column_name]
        col.python_date_format = dttm_and_expr[0]
        col.dbatabase_expr = dttm_and_expr[1]
        col.is_dttm = True
    db.session.merge(obj)
    db.session.commit()
    Log.log_add(obj, 'dataset', user_id)
    obj.fetch_metadata()
    tbl = obj

    logging.info("Creating some slices")
    for i, col in enumerate(tbl.columns[:1]):
        slice_data = {
            "granularity_sqla": col.column_name,
            "datasource_id": "8",
            "datasource_name": "multiformat_time_series",
            "datasource_type": "table",
            "granularity": "day",
            "row_limit": config.get("SLICE_ROW_LIMIT"),
            "since": "1 year ago",
            "until": "now",
            "where": "",
            "viz_type": "cal_heatmap",
            "domain_granularity": "month",
            "subdomain_granularity": "day",
        }

        slc = Slice(
            slice_name="时间热力图" + str(i),
            description='时间列: ' + col.column_name,
            viz_type='cal_heatmap',
            datasource_type='table',
            datasource_id=tbl.id,
            params=get_slice_json(slice_data),
            online=True,
            created_by_fk=user_id
        )
        merge_slice(slc, user_id=user_id)
    misc_dash_slices.append(slc.slice_name)


def load_chinese_population(user_id=None):
    """Load China map with population data"""
    logging.info("Loading data into table [chinese_population]")
    df = pd.read_csv(os.path.join(DATA_FOLDER, 'chinese_population.csv'),
                     encoding="utf-8")
    df.to_sql(
        'chinese_population',
        db.engine,
        if_exists='replace',
        chunksize=500,
        dtype={
            'id': Integer(),
            'province': String(32),
            'population': Integer(),
            'area': Float(),
        },
        index=False)

    logging.info("Creating dataset [chinese_population]")
    tbl_name = 'chinese_population'
    tbl = db.session.query(TBL).filter_by(table_name=tbl_name).first()
    if not tbl:
        tbl = TBL(dataset_name='中国人口与面积', table_name=tbl_name)
    tbl.online = True
    tbl.database = get_or_create_main_db()
    tbl.created_by_fk = user_id
    db.session.merge(tbl)
    db.session.commit()
    Log.log_add(tbl, 'dataset', user_id)
    tbl.fetch_metadata()

    logging.info("Creating a slice")
    params_dict = {
        "color_value_format": ".3s",
        "datasource_id": tbl.id,
        "datasource_name": "\u4e2d\u56fd\u4eba\u53e3",
        "entity": "province",
        "rename_color_metric": "\u9762\u79ef(\u4e07\u5e73\u65b9\u5343\u7c73)",
        "secondary_metric": "sum__area",
        "show_color_values": "y",
        "show_colors": "y",
        "viz_type": "chinese_map"}

    slc = Slice(
        slice_name="中国各区面积",
        viz_type='chinese_map',
        datasource_type='table',
        datasource_id=tbl.id,
        params=get_slice_json(params_dict),
        online=True,
        created_by_fk=user_id
    )
    merge_slice(slc, user_id=user_id)
    misc_dash_slices.append(slc.slice_name)


def load_misc_dashboard(user_id=None):
    """Loading a dasbhoard featuring misc charts"""
    logging.info("Creating dashboard [其他类型工作表]")
    db.session.expunge_all()
    DASH_SLUG = "misc_charts"
    dash = db.session.query(Dash).filter_by(slug=DASH_SLUG).first()

    if not dash:
        dash = Dash()
    js = textwrap.dedent("""\
    [
        {
            "col": 1,
            "row": 7,
            "size_x": 6,
            "size_y": 4,
            "slice_id": "442"
        },
        {
            "col": 1,
            "row": 2,
            "size_x": 6,
            "size_y": 5,
            "slice_id": "443"
        },
        {
            "col": 7,
            "row": 2,
            "size_x": 6,
            "size_y": 4,
            "slice_id": "444"
        },
        {
            "col": 9,
            "row": 0,
            "size_x": 4,
            "size_y": 2,
            "slice_id": "455"
        },
        {
            "col": 7,
            "row": 6,
            "size_x": 6,
            "size_y": 5,
            "slice_id": "467"
        },
        {
            "col": 1,
            "row": 0,
            "size_x": 8,
            "size_y": 2,
            "slice_id": "475"
        }
    ]
    """)

    l = json.loads(js)
    slices = (
        db.session
        .query(Slice)
        .filter(Slice.slice_name.in_(misc_dash_slices))
        .all()
    )
    slices = sorted(slices, key=lambda x: x.id)
    for i, pos in enumerate(l):
        pos['slice_id'] = str(slices[i].id)
    dash.name = "其他类型工作表"
    dash.position_json = json.dumps(l, indent=4)
    dash.online = True
    dash.slices = slices
    dash.created_by_fk = user_id
    db.session.merge(dash)
    db.session.commit()
    Log.log_add(dash, 'dashboard', user_id)
