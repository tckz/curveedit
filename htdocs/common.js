/*
 * 曲線エディタ
 * https://github.com/tckz/curveedit
 * 
 * Copyright(c) 2011 tckz<at.tckz@gmail.com>
 * This software is licensed under the MIT license.
 * See COPYRIGHT.txt 
 */

/*
 * 汎用関数
 */

/**
 * undefinedか否か
 */
function is_defined(o) {
	if (typeof o == 'undefined') {
		return  false;
	}
	return  true;
}

/**
 * ブロック要素の中心座標が（x,y)になるような位置に要素座標を設定する。
 */
function adjustPositionByCenter(el, x, y) {
	var o = $(el);
	x = x - Math.floor(o.width() / 2);
	y = y - Math.floor(o.height() / 2);
	o.css({
		"top": y,
		"left": x
	});
	
	return	el;
}


/**
 * モデルからの通知など
 */
var Notifier = function() {
    this.initialize.apply(this, arguments);
}

Notifier.prototype = {
	initialize: function(p) {
		this.observers = [];
		this.user_param = p;
	},
	addObserver: function(observer) {
		this.observers.push(observer);
	},
	notify: function(p) {
		for (var i = 0; i < this.observers.length; i++) {
			var observer = this.observers[i];
			observer.update(this.user_param, p);
		}
	}
};

