interface WidgetOptions {
  [key: string]: string | number | boolean | null;
}

/**
 * Base JSON Widget, used in memory
 */
interface JSONWidget {
  type: number;
  options: WidgetOptions;
}

/**
 * Base Widget class
 */
class Widget extends HTMLElement {
  /** The type of widget */
  type: number;
  /** The widget options */
  options: WidgetOptions = {};

  constructor(type: number, options: WidgetOptions = {}) {
    super();

    this.type = type;
    this.classList.add("widget-" + this.type.toString());
    this.options = options;

    //! Placeholder / Test code
    this.innerText = JSON.stringify(this.toJSON());
  }

  static fromJSON(json: JSONWidget): Widget {
    return createWidget(json.type, json.options);
  }

  toJSON(): JSONWidget {
    return { type: this.type, options: this.options };
  }
}
window.customElements.define("widget-generic", Widget);

enum WidgetTypes {
  Generic,
  Time,
  Date,
  Ip,
}

const timeWidgets: Widget[] = [];
function _updateTimeWidgets() {
  let now = new Date();
  timeWidgets.forEach((widget) => {
    widget.innerText = now.toLocaleTimeString(
      widget.options["12h"] ? "us" : "de"
    );
  });
}
setInterval(_updateTimeWidgets, 200);

const dateWidgets: Widget[] = [];
function _updateDateWidgets() {
  let now = new Date();
  dateWidgets.forEach((widget) => {
    switch (widget.options["format"]) {
      case "reverse":
        widget.innerText = now.toLocaleDateString("us");
        break;

      default:
        widget.innerText = now.toLocaleDateString("de");
        break;
    }
  });
}
setInterval(_updateDateWidgets, 500);

const ipWidgets: Widget[] = [];
interface SystemInfo {
  [key: string]: string | number | boolean | null | any;
}
let system_info: SystemInfo;
function _updateSystemInfo() {
  fetch("https://www.gogeoip.com/json/?user", {}).then(async (response) => {
    system_info = await response.json();
    _updateSystemInfoWidgets();
  });
}
function _updateSystemInfoWidgets() {
  let empty = false;
  if (!system_info) empty = true;
  ipWidgets.forEach((widget) => {
    if (empty) return (widget.innerText = "");
    let out: string[] = [system_info["network"]["ip"]];
    if (widget.options["city"]) out.push(system_info["location"]["city"]);
    if (widget.options["region"])
      out.push(system_info["location"]["region_name"]);
    if (widget.options["country"])
      out.push(system_info["location"]["country"]["name"]);
    widget.innerText = out.join(", ");
  });
}
setInterval(_updateSystemInfo, 6e5);

function _updateAll(init: boolean = false) {
  _updateTimeWidgets();
  _updateDateWidgets();
  _updateSystemInfoWidgets();
  if (init) _updateSystemInfo();
}

const _widgets: Widget[] = [];
function createWidget(type: WidgetTypes.Generic, options?: {}): Widget;
function createWidget(
  type: WidgetTypes.Time,
  options?: { "12h"?: boolean }
): Widget;
function createWidget(
  type: WidgetTypes.Date,
  options?: {
    format?: "normal" | "reverse"; // TODO: Replace with proper formatting (%d, %m, %y, etc.)
  }
): Widget;
function createWidget(
  type: WidgetTypes.Ip,
  options?: {
    city?: boolean;
    region?: boolean;
    country?: boolean;
  }
): Widget;
function createWidget(type: WidgetTypes, options?: WidgetOptions): Widget;
function createWidget(type: number, options?: {}): Widget {
  let widget: Widget = new Widget(type, options ? options : {});
  _widgets.push(widget);
  switch (type) {
    case WidgetTypes.Time:
      timeWidgets.push(widget);
      break;
    case WidgetTypes.Date:
      dateWidgets.push(widget);
      break;
    case WidgetTypes.Ip:
      ipWidgets.push(widget);
      break;

    default:
      console.warn("Generic widget initialized");
      break;
  }

  return widget;
}
function removeWidget(widget?: Widget): void {
  if (!widget) widget = _widgets[_widgets.length - 1];
  widget.remove();
  _widgets.splice(_widgets.indexOf(widget), 1);
  switch (widget.type) {
    case WidgetTypes.Time:
      timeWidgets.splice(timeWidgets.indexOf(widget), 1);
      break;
    case WidgetTypes.Date:
      dateWidgets.splice(dateWidgets.indexOf(widget), 1);
      break;
    case WidgetTypes.Ip:
      ipWidgets.splice(dateWidgets.indexOf(widget), 1);
      break;

    default:
      console.warn("Generic widget removed");
      break;
  }
  removeStoredWidget(getStoredWidgets()!.indexOf(widget.toJSON()));
}

/**
 * Read widget list from memory as `JSONWidget[]`
 * If the memory is corrupted, ask user if they want to reset it.
 * @returns The widgets from memory, null if memory is corrupted and the user declines the reset
 */
function getStoredWidgets(): JSONWidget[] | null {
  let json: string | null = localStorage.getItem("widgets");
  if (!json) _overwriteStoredWidgets([]);
  try {
    return JSON.parse(json == null ? "[]" : json);
  } catch (e) {
    return window.confirm(
      "An error occurred while reading the saved widgets list.\nWould you like to reset it?\n" +
        String(e)
    )
      ? _overwriteStoredWidgets([])
      : null;
  }
}

/**
 * Overwrite the currently stored list of widgets
 * @param widgets List of widgets to save
 * @returns `<widgets>` parameter
 */
function _overwriteStoredWidgets(widgets: JSONWidget[]): JSONWidget[] {
  localStorage.setItem("widgets", JSON.stringify(widgets));
  return widgets;
}

/**
 * Remove widget at id `<id>` from memory
 * @param id The widget id to remove
 * @returns The updated list of widgets
 */
function removeStoredWidget(id: number): JSONWidget[] {
  let widgets: JSONWidget[] = getStoredWidgets()!;
  widgets.splice(id, 1);
  return _overwriteStoredWidgets(widgets);
}

/**
 * Save widget to memory at position `<offset>`
 * @param widget The widget object to save
 * @param offset The position at which to insert the widget, default -1 (last)
 * @returns The updated list of widgets
 */
function insertWidget(widget: JSONWidget, offset?: number): JSONWidget[] {
  let widgets: JSONWidget[] = getStoredWidgets()!;
  if (offset == undefined) widgets.push(widget);
  else widgets.splice(offset, 0, widget);
  return _overwriteStoredWidgets(widgets);
}

function displayWidget(widget: Widget) {
  document.body.appendChild(widget);
  console.log("Widget", widget, "\n Type", widget.type, "\n", widget.options);
}

let widgets = [];
getStoredWidgets()!.forEach((json: JSONWidget) => {
  displayWidget(Widget.fromJSON(json));
});
_updateAll(true);

window.addEventListener("load", () => {
  document.getElementById("add12h")!.addEventListener("click", () => {
    let widget = createWidget(WidgetTypes.Time, { "12h": true });
    insertWidget(widget.toJSON());
    displayWidget(widget);
    _updateTimeWidgets();
  });
  document.getElementById("add24h")!.addEventListener("click", () => {
    let widget = createWidget(WidgetTypes.Time);
    insertWidget(widget.toJSON());
    displayWidget(widget);
    _updateTimeWidgets();
  });
  document.getElementById("addde")!.addEventListener("click", () => {
    let widget = createWidget(WidgetTypes.Date);
    insertWidget(widget.toJSON());
    displayWidget(widget);
    _updateDateWidgets();
  });
  document.getElementById("addus")!.addEventListener("click", () => {
    let widget = createWidget(WidgetTypes.Date, { format: "reverse" });
    insertWidget(widget.toJSON());
    displayWidget(widget);
    _updateDateWidgets();
  });
  document.getElementById("addip")!.addEventListener("click", () => {
    let conf = document.getElementById("addip-conf") as HTMLSelectElement;
    let options = Number(conf.value);
    let widget = createWidget(WidgetTypes.Ip, {
      city: options & 0b100,
      region: options & 0b010,
      country: options & 0b001,
    });
    insertWidget(widget.toJSON());
    displayWidget(widget);
    _updateSystemInfoWidgets();
  });
  document.getElementById("remove")!.addEventListener("click", () => {
    removeWidget();
  });
  document.getElementById("clear")!.addEventListener("click", () => {
    _overwriteStoredWidgets([]);
    location.reload();
  });
});

function newWidget(
  type: WidgetTypes,
  options?: WidgetOptions,
  insert_pos?: number
): Widget {
  let widget = createWidget(type, options);
  insertWidget(widget, insert_pos);
  displayWidget(widget);
  _updateAll();
  return widget;
}
