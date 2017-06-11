export default function SubPreview () {
    return (
        <div className="data-detail-preview">
            <div className="data-detail-border">
                <label className="data-detail-item">
                    <span>type：</span>
                    <input type="text" value="Separated values(CSV,TSV,...)" />
                </label>
                <label className="data-detail-item">
                    <span>Quoting style：</span>
                    <input type="text" value="" />
                    <i className="icon infor-icon"></i>
                </label>
                <label className="data-detail-item">
                    <span>Separator：</span>
                    <input type="text" value="" />
                    <i className="icon infor-icon"></i>
                </label>
                <label className="data-detail-item">
                    <span>Quoting character：</span>
                    <input type="text" value="" />
                    <i className="icon infor-icon"></i>
                </label>
                <label className="data-detail-item">
                    <span>Skip first lines：</span>
                    <input type="text" value="" />
                </label>
                <label className="data-detail-item">
                    <span></span>
                    <div className="data-detail-checkbox">
                        <input type="checkbox" name="" id="" />
                        <p>Parse next line as column headers </p>
                    </div>
                </label>
                <label className="data-detail-item">
                    <span>Skip next lines：</span>
                    <input type="text" value="" />
                </label>
                <label className="data-detail-item">
                    <span>Charset：</span>
                    <input type="text" value="" />
                </label>
                <label className="data-detail-item">
                    <span>arrayMapFormat：</span>
                    <input type="text" value="" />
                    <i className="icon infor-icon"></i>
                </label>
                <label className="data-detail-item">
                    <span>arrayItemSeparator：</span>
                    <input type="text" value="" />
                </label>
                <label className="data-detail-item">
                    <span>mapKeySeparator：</span>
                    <input type="text" value="" />
                </label>
                <label className="data-detail-item">
                    <span>Date serialization format：</span>
                    <input type="text" value="" />
                </label>
                <label className="data-detail-item">
                    <span>File Compression：</span>
                    <input type="text" value="" />
                    <i className="icon infor-icon"></i>
                </label>
                <label className="data-detail-item">
                    <span>Bad data type behavior (read)：</span>
                    <input type="text" value="" />
                    <i className="icon infor-icon"></i>
                </label>
                <label className="data-detail-item">
                    <span>Bad data type behavior (write)：</span>
                    <input type="text" value="" />
                    <i className="icon infor-icon"></i>
                </label>
                <label className="data-detail-item">
                    <span></span>
                    <div className="data-detail-checkbox">
                        <input type="checkbox" name="" id="" />
                        <p>Normalize booleans Normalize all possible boolean values (0, 1, yes, no, …) to 'true' and 'false' </p>
                    </div>
                </label>
                <label className="data-detail-item">
                    <span></span>
                    <div className="data-detail-checkbox">
                        <input type="checkbox" name="" id="" />
                        <p>Normalize floats & doubles Normalize floating point values (force '42' to '42.0')</p>
                    </div>
                </label>

                <label className="data-detail-item">
                    <span>Add. columns behavior (read)：</span>
                    <input type="text" value="" />
                    <i className="icon infor-icon"></i>
                </label>
            </div>
            <label className="sub-btn">
                <input type="button" value="保存" />
            </label>
        </div>
    );
}