import React from 'react';
import ReactDOM from "react-dom";

import {Panel} from "./components/Panel.jsx";
import "./../css/style.css";

/**
 * @type {IPanelAPI}
 */
window.PANEL_API = {
	init : undefined, detach: undefined, emit: undefined
}

ReactDOM.render(<Panel/>, document.querySelector('#app'));

