import { render } from 'react-dom';
import React from 'react';
import { LoadingModal } from '../javascripts/common/components';

export function renderLoadingModal() {
    const loadingModal = render(
        <LoadingModal />,
        document.getElementById('popup_root'));

    return loadingModal;
}
