/*
 * 曲線エディタ
 * https://github.com/tckz/curveedit
 * 
 * Copyright(c) 2011 tckz<at.tckz@gmail.com>
 * This software is licensed under the MIT license.
 * See COPYRIGHT.txt 
 */

/**
 * ハンドル
 */
var	HandleView = function() {
    this.initialize.apply(this, arguments);
}

HandleView.prototype = {
	initialize: function(el) {
		this.knob_elements = el;
	},
	close: function() {
		$(this.knob_elements).remove();
		this.knob_elements = undefined;
	},
	update: function(model, p) {
		// 表示先エレメントがない
		if (!this.knob_elements) {
			return;
		}

		// ノブ座標を描画反映
		var index = 0;
		$(this.knob_elements).each(function() {
			var pos = model.getKnobPosition(index);
			adjustPositionByCenter($(this), pos.x, pos.y);
			index++;
		});
	}
};

