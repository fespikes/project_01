const $ = require('jquery');
const utils = require('./modules/utils');
import { checkConfig, replaceAppName } from '../utils/utils.jsx';

$(document).ready(function() {
    $(':checkbox[data-checkbox-api-prefix]').change(function() {
        const $this = $(this);
        const prefix = $this.data('checkbox-api-prefix');
        const id = $this.attr('id');
        utils.toggleCheckbox(prefix, '#' + id);
    });

    const copyright = document.querySelector('.copyright');

    checkConfig('copyright', function(res) {
        copyright.innerHTML = res;
    });

    replaceAppName();
});
