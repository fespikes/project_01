import fetch from 'isomorphic-fetch';
import { getAbsUrl } from '../utils';

export const REQUEST_POSTS = 'REQUEST_POSTS';
export const RECEIVE_POSTS = 'RECEIVE_POSTS';
export const NAVIGATE_TO = 'NAVIGATE_TO';
export const SWITCH_FAV = 'SWITCH_FAV';
export const SEARCH_REDDIT = 'SEARCH_REDDIT';

const baseURL = window.location.origin + '/slice/';

export function navigateTo(pageNumber){
  return {
    pageNumber,
    type: NAVIGATE_TO
  }
}

export function switchFavorite(onlyFavorite){
  return {
    onlyFavorite,
    type: SWITCH_FAV
  }
}

function requestPosts(pageNumber) {
  return {
    type: REQUEST_POSTS,
    pageNumber,
  };
}

function receivePosts(pageNumber, json) {
  return {
    type: RECEIVE_POSTS,
    pageNumber,
    posts: json, //.data.children.map(child => child.data),
    receivedAt: Date.now()
  };
}

function fetchPosts(pageNumber) {
  return dispatch => {
    dispatch(requestPosts(pageNumber));
    const url = baseURL + "listdata";
    // const url = '/javascripts/sliceList/mock/data.json';

    return fetch(url, {
        credentials: 'include',
        method: 'GET'
      })
      .then(response => {
        if(response.ok) {
          return response.json();
        }
        throw new Error('Network response was not ok.');
      })
      .then(response => {

        /*let dataSource = [];
        response.data.forEach(function(slice, index) {
          let obj = {};
          obj.key = index + 1;
          obj.name = slice.slice_name;
          obj.type = slice.viz_type;
          obj.set = slice.datasource;
          obj.owner = slice.created_by_user;
          obj.state = slice.online;
          obj.time = slice.changed_on;
          dataSource.push(obj);
        });*/
        
        dispatch(receivePosts(pageNumber, response.data ));
      }).catch( argus => {
        console.log(argus);
      });
  };

}

function shouldFetchPosts(state, pageNumber) {
  const posts = state.postsBypageNumber[pageNumber];
  if (!posts) {
    return true;
  }
  if (posts.isFetching) {
    return false;
  }
  return posts.didInvalidate;
}

export function fetchPostsIfNeeded(pageNumber) {
  return (dispatch, getState) => {
    if (shouldFetchPosts(getState(), pageNumber)) {
      return dispatch(fetchPosts(pageNumber));
    }
    return null;
    // return dispatch(fetchPosts(pageNumber));

  };
}

export function searchReddit(reddit){
  return (dispatch, getState) => {
    dispatch(requestPosts(reddit.pageNumber));
    const url = baseURL + "listdata"+ '?filter='+ reddit.filter;
//page=0&page_size=10 &order_column=changed_on&order_direction=desc &filter=hive&only_favorite=0 

    return fetch(url, {
        credentials: 'include',
        method: 'GET'
      })
      .then(response => {
        if(response.ok) {
          return response.json();
        }
        throw new Error('Network response was not ok.');
      })
      .then(response => {
        dispatch(receivePosts(reddit.pageNumber, response.data ));
      }).catch( argus => {
        console.log(argus);
      });
  };
}

export function removeReddit(params){
  return (dispatch, getState) => {
    // dispatch(requestPosts(params.pageNumber));

  fetch( baseURL + "muldelete", {
    credentials: 'include',
    method: 'post',
    body: JSON.stringify({
      selectedRowKeys: params.selectedRowKeys
    })
  }).then(response => {
        if(response.ok) {
          return response.json();
        }
        throw new Error('Network response was not ok.');
      })
      .then(response => {
        console.log(response, 'in removeReddit.')
        if(response.success)
          dispatch(requestPosts(getState().selectedReddit.pageNumber));
      }).catch( argus => {
        console.log(argus);
      });
  };
}