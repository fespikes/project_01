from flask_appbuilder import Model
from superset.models import AuditMixinNullable
from sqlalchemy import (
    Column, Integer, String, ForeignKey, LargeBinary
)
from sqlalchemy.orm import backref, relationship


class HDFSConnection(Model, AuditMixinNullable):
    __tablename__ = 'hdfs_connection'
    type = 'table'

    id = Column(Integer, primary_key=True)
    connection_name = Column(String(256), nullable=False)
    database_id = Column(Integer, ForeignKey('dbs.id'))
    webhdfs_url = Column(String(256), nullable=False)
    fs_defaultfs = Column(String(256), nullable=False)
    logical_name = Column(String(256), nullable=False)
    principal = Column(String(256), nullable=False)
    hdfs_user = Column(String(256), nullable=False)
    keytab_file = Column(LargeBinary)
    database = relationship(
        'Database',
        backref=backref('hdfs_connection', lazy='dynamic'),
        foreign_keys=[database_id])


class HDFSTable(Model, AuditMixinNullable):
    __tablename__ = "hdfs_table"
    type = 'table'

    id = Column(Integer, primary_key=True)
    hdfs_path = Column(String(256), nullable=False)
    separator = Column(String(256), nullable=False)
    hdfs_connection_id = Column(Integer, ForeignKey('hdfs_connection.id'))
    hdfsconnection = relationship(
        'HDFSConnection',
        backref=backref('ref_hdfs_connection', lazy='joined'),
        foreign_keys=[hdfs_connection_id]
    )

    def create_out_table(self, table_name, column_desc):
        create_sql = "create external table " + table_name + "("
        for column_name, column_type in column_desc.items():
          create_sql = create_sql + column_name + " " + column_type + ","
        create_sql = create_sql[:-1] \
                     + ") row format delimited fields terminated by '" \
                     + self.separator + "' location '" \
                     + self.hdfs_path + "'"

        engine = self.hdfsconnection.database.get_sqla_engine()
        engine.execute("drop table if exists " + table_name)
        engine.execute(create_sql)