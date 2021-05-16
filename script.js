Vue.component("linechart", {
  props: {
    width: { type: Number, default: 400, required: true },
    height: { type: Number, default: 40, required: true },
    values: { type: Array, default: [], required: true },
  },
  data() {
    return { cx: 0, cy: 0 };
  },
  computed: {
    viewBox() {
      return "0 0 " + this.width + " " + this.height;
    },
    chartPoints() {
      let data = this.getPoints();
      let last = data.length ? data[data.length - 1] : { x: 0, y: 0 };
      let list = data.map((d) => d.x - 10 + "," + d.y);
      this.cx = last.x - 5;
      this.cy = last.y;
      return list.join(" ");
    },
  },
  methods: {
    getPoints() {
      this.width = parseFloat(this.width) || 0;
      this.height = parseFloat(this.height) || 0;
      let min = this.values.reduce(
        (min, val) => (val < min ? val : min),
        this.values[0]
      );
      let max = this.values.reduce(
        (max, val) => (val > max ? val : max),
        this.values[0]
      );
      let len = this.values.length;
      let half = this.height / 2;
      let range = max > min ? max - min : this.height;
      let gap = len > 1 ? this.width / (len - 1) : 1;
      let points = [];

      for (let i = 0; i < len; ++i) {
        let d = this.values[i];
        let val = 2 * ((d - min) / range - 0.5);
        let x = i * gap;
        let y = -val * half * 0.8 + half;
        points.push({ x, y });
      }
      return points;
    },
  },
  template: `
  <svg :viewBox="viewBox" xmlns="http://www.w3.org/2000/svg">
    <polyline class="color" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" :points="chartPoints" />
    <circle class="color" :cx="cx" :cy="cy" r="4" fill="#fff" stroke="none" />
  </svg>`,
});

// Component for showing single Coin item information
Vue.component("coin", {
  props: {
    assetIcon: String,
    token: String,
    asset: String,

    c: {
      type: [Object, Array],
    },
  },
  template: `

  <div class="coin_main" :class="c.style">
    <div class="coin_some_effect"></div>
    <div class="coin_head">
        <div class="coin_image">
            <img :src="assetIcon" :alt="token"/>
        </div>
        <div class="coin_info">
            <div class="coin_info_left">
                <h1>
                    {{ token }}<small><span>/</span>{{ asset }}</small>
                </h1>
                <h2>{{ c.close.toFixed(10).replace(/(\.\d*?[1-9])0+$/g, "$1") }}</h2>
            </div>
            <div class="coin_info_right">
                <ul>
                    <li>{{ c.arrow }} {{ c.sign }}{{ c.percent | toFixed( 2 ) }}%</li>
                    <li>{{ c.sign }}{{ c.change.toFixed(10).replace(/(\.\d*?[1-9])0+$/g, "$1") }}<small>Change</small></li>
                    <li>{{ c.assetVolume.toLocaleString() }}<small>{{ asset }} Vol</small></li>
                </ul>
            </div>
        </div>
    </div>
    <div class="coin_chart">
        <linechart
          :width="380"
          :height="25"
          :values="c.history"
        ></linechart>
    </div>
</div>



`,
});

// vue instance
new Vue({
  // mount point
  el: "#coins",

  // app data
  data() {
    return {
      endpoint: "wss://stream.binance.com:9443/ws/!ticker@arr",
      cache: {}, // coins data cache
      coins: [], // live coin list from api
      cx: 0,
      cy: 0,
    };
  },

  computed: {
    coinsList() {
      let list = this.coins.slice();
      return list;
    }
  },

  methods: {
    onSockData(e) {
      let list = JSON.parse(e.data) || [];

      for (let item of list) {

        let c = this.getCoinData(item);

        c.history = this.cache.hasOwnProperty(c.symbol)
          ? this.cache[c.symbol].history
          : this.fakeHistory(c.close);

        if (c.history.length > 100) {
          c.history = c.history.slice(c.history.length - 100);
        }

        c.history.push(c.close);

        this.cache[c.symbol] = c;
      }

      this.coins = Object.keys(this.cache).map((s) => this.cache[s]);
    },

    sockInit() {
      try {
        this.sock = new WebSocket(this.endpoint);
        this.sock.addEventListener("open", this.onSockOpen);
        this.sock.addEventListener("close", this.onSockClose);
        this.sock.addEventListener("error", this.onSockError);
        this.sock.addEventListener("message", this.onSockData);
      } catch (err) {
        console.error("WebSocketError:", err.message || err);
        this.sock = null;
      }
    },

    sockClose() {
      if (this.sock) {
        this.sock.close();
      }
    },

    fakeHistory(close) {
      let num = close * 0.0001;
      let min = -Math.abs(num);
      let max = Math.abs(num);
      let out = [];

      for (let i = 0; i < 0; ++i) {
        let rand = Math.random() * (max - min) + min;
        out.push(close + rand);
      }
      return out;
    },

    getCoinData(item) {
      let symbol = String(item.s)
        .replace(/[^\w\-]+/g, "")
        .toUpperCase();
      let open = parseFloat(item.o);
      let high = parseFloat(item.h);
      let low = parseFloat(item.l);
      let close = parseFloat(item.c);
      let change = parseFloat(item.p);
      let percent = parseFloat(item.P);
      let trades = parseInt(item.n);
      let tokenVolume = Math.round(item.v);
      let assetVolume = Math.round(item.q);
      let sign = percent >= 0 ? "+" : "";
      let arrow = percent >= 0 ? "▲" : "▼";
      let style = percent > 0 ? "gain" : "loss";

      return {
        symbol,
        open,
        high,
        low,
        close,
        change,
        percent,
        trades,
        tokenVolume,
        assetVolume,
        sign,
        arrow,
        style,
      };
    },

    getSingleCoin(name) {
      let coin = this.coinsList.filter((item) => item.symbol == name);
      return coin[0];
    },
  },

  mounted() {
    this.sockInit();
  },

  destroyed() {
    this.sockClose();
  },
});
