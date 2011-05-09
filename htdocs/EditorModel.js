/**
 * 点モデル
 */
var Dot = function() {
    this.initialize.apply(this, arguments);
}

Dot.prototype = {
	/**
	 * 図上のx,y座標
	 */
	initialize: function(x, y, id) {
		this.x = x;
		this.y = y;

		/*
		 * このドットから次のドットへ至る制御点の座標
		 */
		this.cp1x = undefined;
		this.cp1y = undefined;
		this.cp2x = undefined;
		this.cp2y = undefined;


		this.id = id;
		this.next = undefined;
		this.previous = undefined;

		this.selected = false;

		this.notifier = new Notifier(this);
	},
	toSerializable: function() {
		var ret = {
			cp1x: this.cp1x,
			cp1y: this.cp1y,
			cp2x: this.cp2x,
			cp2y: this.cp2y,
			x: this.x,
			y: this.y
		};

		return ret;
	},
	/**
	 * ドットの座標を相対座標で変更。
	 * 制御点も同様に変更される。
	 */
	setPositionRelative: function(rx, ry, rx1, ry1, rx2, ry2) {
		if (rx) {
			this.x = this.x + rx;
		}
		if (ry) {
			this.y = this.y + ry;
		}

		if (is_defined(this.cp1x) && rx1) {
			this.cp1x = this.cp1x + rx1;
		}

		if (is_defined(this.cp1y) && ry1) {
			this.cp1y = this.cp1y + ry1;
		}

		if (is_defined(this.cp2x) && rx2) {
			this.cp2x = this.cp2x + rx2;
		}

		if (is_defined(this.cp2y) && ry2) {
			this.cp2y = this.cp2y + ry2;
		}

		this.notifier.notify();
	},
	/**
	 * 制御点座標を設定
	 */
	setCPPosition: function(cp1x, cp1y, cp2x, cp2y) {
		if (is_defined(cp1x) && is_defined(cp1y)) {
			this.cp1x = cp1x;
			this.cp1y = cp1y;
		}
		if (is_defined(cp2x) && is_defined(cp2y)) {
			this.cp2x = cp2x;
			this.cp2y = cp2y;
		}

		this.notifier.notify();
	},
	setPosition: function(x, y) {
		this.x = x;
		this.y = y;

		this.notifier.notify();
	}
};

/**
 * エディタ:model
 */
var EditorModel = function() {
    this.initialize.apply(this, arguments);
}

EditorModel.prototype = {
	initialize: function() {
		this.dots = [];
		this.background_image = undefined;

		// どんどん増えるだけ。モデルの中で一意な番号を振る。
		this.dot_count = 0;

		// ドットのインデックス番号を表示するか否か
		this.show_index = false;

		this.first = undefined;
		this.last = undefined;

		this.current_handle = undefined;

		this.notifier = new Notifier(this);
	},
	getShowIndex: function() {
		return	this.show_index;
	},
	setShowIndex: function(flag) {
		this.show_index = flag ? true : false;
	},
	toSerializable: function() {
		var ret = {
			dots: [],
			background_image: this.background_image
		};

		for (var dot = this.first; is_defined(dot); dot = dot.next) {
			ret.dots.push(dot.toSerializable());
		}

		return	ret;
	},
	fromSerializable: function(t) {
		this.background_image = this.background_image;
		var dots = t.dots;
		for (var i = 0; i < dots.length; i++) {
			var dot = this.newDot(dots[i].x, dots[i].y);
			dot.setCPPosition(
				dots[i].cp1x, dots[i].cp1y,
				dots[i].cp2x, dots[i].cp2y
			);
		}
	},
	setCurrentHandle: function(h) {
		this.current_handle = h;
	},
	getCurrentHandle: function() {
		return	this.current_handle;
	},
	/**
	 * 全dotsを指定された選択状態に。
	 */
	setSelectedAll: function(flag) {
		for (var i = 0; i < this.dots.length; i++) {
			this.dots[i].selected = flag;
		}
	},
	/**
	 * 指定されたdotsだけを指定された選択状態に。
	 */
	setSelected: function(dots, flag) {
		for (var i = 0; i < dots.length; i++) {
			var dot = this.findDotById(dots[i].id);
			dot.selected = flag;
		}
	},
	/**
	 * 選択状態のdotsを返す
	 */
	getSelected: function() {
		var ret = [];

		for (var i = 0; i < this.dots.length; i++) {
			var dot = this.dots[i];
			if (dot.selected) {
				ret.push(dot);
			}
		}

		return ret;
	},
	setBackgroundImage: function(url) {
		if (!is_defined(url) || !url.match(/^(https?:\/\/|[\.$,;=\?!\*~@_\(\)a-zA-Z0-9]+\/)[\.$,;:&=\?!\*~@#_\(\)a-zA-Z0-9\/]+$/)) {
			return {message: "Invalid URL."};
		}
		this.background_image = url;

		this.notifier.notify();

		return {success: true};
	},
	getBackgroundImage: function() {
		return this.background_image;
	},
	previousDot: function(dot) {
		var prev = dot.previous;
		if (!is_defined(prev)) {
			prev = this.last;
		}
		return prev;
	},
	nextDot: function(dot) {
		var next = dot.next;
		if (!is_defined(next)) {
			next = this.first;
		}
		return next;
	},
	deleteDots: function(targets) {
		for (var i = 0; i < targets.length; i++){
			var target = targets[i];
			this.deleteDot(target);
		}

		this.notifier.notify();
	},
	/**
	 * @param	target 削除したいドットモデル
	 */
	deleteDot: function(target) {
		/*
		 * 3点を割るとパスが閉じなくて面倒なので、削除不可に。
		 */
		if (this.dots.length <= 3 || !target) {
			return;
		}

		for (var i = 0; i < this.dots.length; i++) {
			var dot = this.dots[i];
			if (dot === target) {
				var prev = dot.previous;
				var next = dot.next;

				if (!prev) {
					this.first = next;
				} else {
					prev.next = next;
				}
				if (!next) {
					this.last = prev;
				} else {
					next.previous = prev;
				}

				this.dots.splice(i, 1);

				return;
			}
		}
	},
	/**
	 * 指定された座標に一番近いドットを返す
	 */
	findDotNearByPoint: function(x, y) {
		var ret = undefined;
		var nearest_dist = 99999;

		var loc = {x: x, y: y};
		for (var i = 0; i < this.dots.length; i++) {
			var dot = this.dots[i];
			var dist = this.calcDistance(dot, loc);
			if (dist < nearest_dist) {
				ret = dot;
				nearest_dist = dist;
			}
		}

		return ret;
	},
	/**
	 * p2-p1間の距離を計算する
	 * p2省略時は原点
	 */
	calcDistance: function(p1, p2) {
		if (!is_defined(p2)) {
			p2 = {x: 0, y: 0};
		}
		var dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
		return	dist;
	},
	findDotById: function(id) {
		for (var i = 0; i < this.dots.length; i++) {
			var dot = this.dots[i];
			if (dot.id == id) {
				return	dot;
			}
		}

		return	undefined;
	},
	/**
	 * 現在のドット座標群の重心座標を計算して返す
	 * ドットの数が0のときは、undefined
	 */
	calcCenterPosition: function() {
		var num = this.dots.length;
		if (num == 0) {
			return	undefined;
		}

		var sum = {x: 0, y: 0};

		for (var i = 0; i < num; i++) {
			var dot = this.dots[i];
			sum.x = sum.x + dot.x;
			sum.y = sum.y + dot.y;
		}

		return {x: sum.x/num, y: sum.y/num};
	},
	getDot: function(i) {
		return 	this.dots[i];
	},
	/**
	 * 現在のドットの数
	 */
	getDotsCount: function() {
		return	this.dots.length;
	},
	/**
	 * ドットp1からp2に向かうベクトル（に相当する）x.yを返す
	 */
	toVector: function(p1, p2) {
		return {
			x: p2.x - p1.x,
			y: p2.y - p1.y
		};
	},
	/**
	 * （リスト登録済の）ドットに対しデフォルトの制御点を設定する
	 *
	 * ドットが3つ未満の状態は考えていない
	 */
	setDefaultCPPosition: function(dot) {
		var center = this.calcCenterPosition();
		var prev = this.previousDot(dot);
		var next = this.nextDot(dot);

		// ドットの座標から重心へのベクトル
		var v = this.toVector(dot, center);
		// vをnormalize
		var v_size = this.calcDistance(v);
		v.x = v.x / v_size;
		v.y = v.y / v_size;

		var v_cp_size = v_size / 3.0;
		// ドットから見て前のドットに向かう制御点
		var cp_prev = {
			x: v.y * v_cp_size + dot.x,
			y: (v.x * -1) * v_cp_size + dot.y
		};
		// ドットから見て次のドットに向かう制御点
		var cp_next = {
			x: -v.y * v_cp_size + dot.x,
			y: v.x * v_cp_size + dot.y
		};

		// cp_prev -> prevと
		// cp_next -> nextが交差する場合は、制御点を逆にする。
		if (this.isIntersect(cp_prev, prev, cp_next, next)) {
			var t = cp_prev;
			cp_prev = cp_next;
			cp_next = t;
		}

		prev.setCPPosition(undefined, undefined, 
			cp_prev.x, cp_prev.y
		);

		dot.setCPPosition(cp_next.x, cp_next.y);
	},
	/**
	 * 線分a1-a2とb1-b2が交差するかどうか
	 */
	isIntersect: function(a1, a2, b1, b2) {
		// てきとう・・・
		var eps = 0.00000000000000000001;
		return (this.calcCrossProduct(
			this.toVector(a1, a2), this.toVector(a1, b1)) *
		this.calcCrossProduct(
			this.toVector(a1, a2), this.toVector(a1, b2)) < eps) &&
		(this.calcCrossProduct(
			this.toVector(b1, b2), this.toVector(b1, a1)) *
		this.calcCrossProduct(
			this.toVector(b1, b2), this.toVector(b1, a2)) < eps);
	},
	/**
	 * ベクトルv1とv2の外積
	 * 平面上なのでスカラーに
	 */
	calcCrossProduct: function(v1, v2) {
		return v1.x * v2.y - v1.y * v2.x;
	},
	/**
	 * 平面上の座標を指定して新しい点モデルを返す
	 *
	 * neighborを指定した場合は、（リンクリスト上）指定ノードの次の位置にする。
	 *
	 * @param neighbor 前のドット
	 */
	newDot: function(x, y, neighbor) {
		var dot = new Dot(x, y, "dot" + this.dot_count);
		this.dots.push(dot);

		if (this.dots.length == 1) {
			this.first = dot;
			this.last = dot;
		} else {
			this.last.next = dot;
			dot.previous = this.last;

			this.last = dot;
		}

		if (is_defined(neighbor)) {
			this.moveNextTo(dot, neighbor);
		}

		this.dot_count++;
		return dot;
	},
	/**
	 * 指定されたドットを指定された隣人の次のノードにする
	 */
	moveNextTo: function(dot, neighbor) {
		var org_neighbor_next = neighbor.next;

		if (org_neighbor_next === dot) {
			return;
		}

		var org_dot_prev = dot.previous;
		var org_dot_next = dot.next;

		if (!neighbor.next) {
			this.last = dot;
		}
		neighbor.next = dot;

		dot.previous = neighbor;
		dot.next = org_neighbor_next;

		if (!org_dot_prev) {
			this.first = org_dot_next;
		} else {
			org_dot_prev.next = org_dot_next;
		}

		if (!org_dot_next) {
			this.last = org_dot_prev;
		} else {
			org_dot_next.previous = org_dot_prev;
		}

		if (org_neighbor_next) {
			org_neighbor_next.previous = dot;
		}
	}
};

