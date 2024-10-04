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
function createWidget(type: WidgetTypes, options?: WidgetOptions): Widget {
  let widget: Widget = new Widget(type, options ? options : {});

  switch (type) {
    case WidgetTypes.Time:
      timeWidgets.push(widget);
      break;
    case WidgetTypes.Date:
      dateWidgets.push(widget);
      break;

    default:
      console.warn("Generic widget initialized");
      break;
  }

  return widget;
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
_updateTimeWidgets();
_updateDateWidgets();

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
  document.getElementById("remove")!.addEventListener("click", () => {
    removeStoredWidget(-1);
    location.reload();
  });
  document.getElementById("clear")!.addEventListener("click", () => {
    _overwriteStoredWidgets([]);
    location.reload();
  });
});
