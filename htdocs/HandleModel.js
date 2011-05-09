/**
 * ハンドル
 */
var	HandleModel = function() {
    this.initialize.apply(this, arguments);
}

/**
 * 動作モード
 */
HandleModel.Mode = {
	// 制御点2つの座標を独立して扱うモード
	Normal: 0,
	// 片方の制御点を決めることで、もう片方が制御点の鏡像位置になるモード
	Smooth: 1
};

HandleModel.prototype = {
	initialize: function(dot, previous_dot, next_dot) {
		// 中心となる点（＝を示すドット）
		this.dot = dot;
		this.previous_dot= previous_dot;
		this.next_dot= next_dot;

		this.mode = HandleModel.Mode.Normal;

		// ノブの座標＝制御点
		this.knob = [
			{x: undefined, y: undefined},
			{x: undefined, y: undefined}
		];

		this.setInitialKnobPosition();

		this.notifier = new Notifier(this);
	},
	/**
	 * ノブの初期位置
	 */
	setInitialKnobPosition: function() {
		var dot = this.dot;
		var prev_dot = this.previous_dot;
		var next_dot = this.next_dot;

		if (is_defined(dot.cp1x) && is_defined(dot.cp1y)) {
			// ドットが制御点座標を持っているなら採用
			this.knob[0].x = dot.cp1x;
			this.knob[0].y = dot.cp1y;
		} else {
			// 次のドットとの中間位置
			this.knob[0].x = (dot.x + next_dot.x)/2;
			this.knob[0].y = (dot.y + next_dot.y)/2;
		}

		if (is_defined(prev_dot.cp2x) && is_defined(prev_dot.cp2y)) {
			// ドットが制御点座標を持っているなら採用
			this.knob[1].x = prev_dot.cp2x;
			this.knob[1].y = prev_dot.cp2y;
		} else {
			// 前のドットとの中間位置
			this.knob[1].x = (dot.x + prev_dot.x)/2;
			this.knob[1].y = (dot.y + prev_dot.y)/2;
		}

		this.reflectKnobPosition2Dot();
	},
	getKnobPosition: function(index) {
		return this.knob[index];
	},
	setKnobPosition: function(index, x, y, mode) {
		this.knob[index].x = x;
		this.knob[index].y = y;

		var dot = this.dot;
		var prev_dot = this.previous_dot;

		// もう片方のノブ位置も変更
		if (mode == HandleModel.Mode.Smooth) {
			var other = (index == 0) ? 1 : 0;
			this.knob[other].x = dot.x - (x - dot.x);
			this.knob[other].y = dot.y - (y - dot.y);
		}

		this.reflectKnobPosition2Dot();

		this.notifier.notify();
	}, 
	/**
	 * ノブ位置をドットの制御点に反映
	 */
	reflectKnobPosition2Dot: function() {
		var dot = this.dot;
		var prev_dot = this.previous_dot;

		// ドットの制御点にノブ位置反映
		// ノブ0は当該dotから次のdotへの制御点1
		dot.cp1x = this.knob[0].x;
		dot.cp1y = this.knob[0].y;

		// ノブ1は前のdotから当該dotへの制御点2
		prev_dot.cp2x = this.knob[1].x;
		prev_dot.cp2y = this.knob[1].y;
	}
};

