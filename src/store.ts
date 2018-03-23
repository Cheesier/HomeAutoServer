import { createStore, combineReducers } from "redux";
import { lightReducer } from "./lights";

export const store = createStore(combineReducers({ light: lightReducer }));
