/* global varialbes */
export const MESSAGE_DURATION = 5;


/* global functions */
export const callbackHandler = (response, callback) => {
    callback && callback(response.status === 200?true:false, response);
};
export const always = (response) => {
    return Promise.resolve(response);
};
export const json = (response) => {
    return response.json();
};