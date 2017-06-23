export default {
	getAbsUrl: relativePath => window.location.origin + relativePath
}

export function getEditConData(database) {
	let db = {};
	db.database_name = database.database_name;
	db.sqlalchemy_uri = database.sqlalchemy_uri;
	return db;
}