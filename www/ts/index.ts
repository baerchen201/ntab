interface WidgetOptions {
  _anchor?:
    | "topleft"
    | "topcenter"
    | "topright"
    | "left"
    | "center"
    | "right"
    | "bottomleft"
    | "bottomcenter"
    | "bottomright";
  _css?: string;
  [key: string]: string | number | boolean | null | undefined;
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
  StaticText,
  DynamicText,
  Space,
  Greeting,
  CSS,
}

//* Dynamic widgets (need updating through scripts)

const timeWidgets: Widget[] = [];
function _updateTimeWidgets() {
  let now = new Date();
  timeWidgets.forEach((widget) => {
    widget.innerText = now.toLocaleTimeString(
      widget.options["format"] as string
    );
  });
}
setInterval(_updateTimeWidgets, 200);

const dateWidgets: Widget[] = [];
function _updateDateWidgets() {
  let now = new Date();
  dateWidgets.forEach((widget) => {
    widget.innerText = now.toLocaleDateString(
      widget.options["format"] as string
    );
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
  if (!system_info || !system_info["network"]) empty = true;
  ipWidgets.forEach((widget) => {
    if (empty) return (widget.innerText = "No network information");
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

const widgets: Widget[] = [];

function saveAllWidgets() {
  let json_widgets: JSONWidget[] = [];
  widgets.forEach((widget) => {
    json_widgets.push(widget.toJSON());
  });
  _overwriteStoredWidgets(json_widgets);
}

//* Widget creation (add definitions here)
function createWidget(type: WidgetTypes.Generic, options?: {}): Widget;
function createWidget(
  type: WidgetTypes.Time,
  options?: { format?: string }
): Widget;
function createWidget(
  type: WidgetTypes.Date,
  options?: {
    format?: string;
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
function createWidget(
  type: WidgetTypes.StaticText | WidgetTypes.DynamicText,
  options?: { text?: string }
): Widget;
function createWidget(
  type: WidgetTypes.Greeting,
  options?: { name?: string }
): Widget;
function createWidget(
  type: WidgetTypes.CSS,
  options: { value: string }
): Widget;
function createWidget(type: WidgetTypes, options?: WidgetOptions): Widget;
function createWidget(type: number, options?: {}): Widget {
  let widget: Widget = new Widget(type, options ? options : {});
  widgets.push(widget);
  switch (type) {
    case WidgetTypes.Time:
      timeWidgets.push(widget);
      break;
    case WidgetTypes.Date:
      dateWidgets.push(widget);
      break;
    case WidgetTypes.Ip:
      widget.innerText = "Loading...";
      ipWidgets.push(widget);
      break;
    case WidgetTypes.DynamicText:
      widget.contentEditable = "true";
      widget.addEventListener("input", () => {
        widget.options["text"] = widget.innerText;
        saveAllWidgets();
      });
    case WidgetTypes.StaticText:
      let text = String(widget.options["text"]).replace("\r", "").trim();
      if (!text) text = "Hello, World!";
      widget.innerText = text;
      break;
    case WidgetTypes.Greeting:
      let parts: string[] = [];
      switch (new Date().getHours()) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
          parts.push("Good morning");
          break;
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case 17:
          parts.push("Good afternoon");
          break;
        case 18:
        case 19:
        case 20:
        case 21:
        case 22:
        case 23:
        case 24: // Oh, you wait until you see the default case
          parts.push("Good evening");
          break;

        default:
          parts.push("Hello"); // WHAT THE F*** DID YOU EVEN DO
          break;
      }
      if (widget.options["name"])
        parts.push(String(widget.options["name"]).trim());
      widget.innerText = parts.join(", ");
      break;
    case WidgetTypes.Space:
      widget.innerText = "\n";
      break;
    case WidgetTypes.CSS:
      // TODO: Add proper live updating (after adding a proper UI first)
      let style_element = document.createElement("style");
      widget.appendChild(style_element);
      style_element.innerHTML = String(widget.options["value"]);
      break;

    default:
      console.warn("Unknown widget initialized", widget);
      break;
  }

  if (widget.options["_anchor"])
    widget.classList.add(widget.options["_anchor"], "anchored");
  // @ts-ignore Works on my machine
  if (widget.options["_css"]) widget.style = widget.options["_css"];

  return widget;
}
function removeWidget(widget?: Widget): void {
  if (!widget) widget = widgets[widgets.length - 1];
  widget.remove();
  widgets.splice(widgets.indexOf(widget), 1);
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
      console.warn("Widget removed without remove code", widget);
      break;
  }
  saveAllWidgets();
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

function displayWidget(widget: Widget, container: HTMLElement) {
  container.appendChild(widget);
  console.debug("Widget", widget, "\n Type", widget.type, "\n", widget.options);
}

/**
 * Stores the background in memory and applies it to document.body
 * @param value The new CSS background property value
 */
function setBackground(value: string): void {
  localStorage.setItem("background", value);
  document.body.style.background = value;
}

/**
 * Recalls the background stored in memory
 * @returns The stored CSS background property value
 */
function getBackground(): string {
  let bg = localStorage.getItem("background");
  return bg ? bg : "";
}

/**
 * Applies the CSS background stored in memory to document.body
 */
function applyStoredBackground() {
  setBackground(getBackground());
}

applyStoredBackground(); //? Not sure if I should put this into window.onload, it should be just fine like this, and prevent the flash of white background.

window.addEventListener("load", () => {
  const widget_container = document.getElementById("widgets") as HTMLDivElement;

  let _createWidgetFromUI = (
    type: WidgetTypes,
    options?: WidgetOptions
  ): Widget => {
    if (!options) options = {};
    let font_size = (document.getElementById("fontsize") as HTMLInputElement)
        .valueAsNumber,
      user_select = (document.getElementById("select") as HTMLInputElement)
        .checked
        ? "initial"
        : null;

    options["_css"] = `${font_size ? `font-size:${font_size}px;` : ""}${
      user_select ? `user-select:${user_select};` : ""
    }`;
    console.debug(options["_css"]);

    // @ts-ignore This works just fine, no need for strict type-checking
    options["_anchor"] = (
      document.getElementById("anchor") as HTMLInputElement
    ).value;

    return createWidget(type, options);
  };
  getStoredWidgets()!.forEach((json: JSONWidget) => {
    displayWidget(Widget.fromJSON(json), widget_container);
  });
  _updateAll(true);

  document.getElementById("addtime")!.addEventListener("click", () => {
    let conf = document.getElementById("addtime-conf") as HTMLSelectElement;
    let widget = _createWidgetFromUI(WidgetTypes.Time, {
      format: conf.value,
    });
    insertWidget(widget.toJSON());
    displayWidget(widget, widget_container);
    _updateTimeWidgets();
  });
  document.getElementById("adddate")!.addEventListener("click", () => {
    let conf = document.getElementById("adddate-conf") as HTMLSelectElement;
    let widget = _createWidgetFromUI(WidgetTypes.Date, {
      format: conf.value,
    });
    insertWidget(widget.toJSON());
    displayWidget(widget, widget_container);
    _updateDateWidgets();
  });
  document.getElementById("addip")!.addEventListener("click", () => {
    let conf = document.getElementById("addip-conf") as HTMLSelectElement;
    let options = Number(conf.value);
    let widget = _createWidgetFromUI(WidgetTypes.Ip, {
      city: options & 0b100,
      region: options & 0b010,
      country: options & 0b001,
    });
    insertWidget(widget.toJSON());
    displayWidget(widget, widget_container);
    _updateSystemInfoWidgets();
  });
  let text_input = document.getElementById("text-content") as HTMLInputElement;
  document.getElementById("addstatic")!.addEventListener("click", () => {
    let widget = _createWidgetFromUI(WidgetTypes.StaticText, {
      text: text_input.value,
    });
    insertWidget(widget.toJSON());
    displayWidget(widget, widget_container);
    _updateSystemInfoWidgets();
  });
  document.getElementById("adddynamic")!.addEventListener("click", () => {
    let widget = _createWidgetFromUI(WidgetTypes.DynamicText, {
      text: text_input.value,
    });
    insertWidget(widget.toJSON());
    displayWidget(widget, widget_container);
    _updateSystemInfoWidgets();
  });
  document.getElementById("addgreeting")!.addEventListener("click", () => {
    let widget = _createWidgetFromUI(WidgetTypes.Greeting, {
      name: (document.getElementById("greeting-name") as HTMLInputElement)
        .value,
    });
    insertWidget(widget.toJSON());
    displayWidget(widget, widget_container);
    _updateSystemInfoWidgets();
  });
  document.getElementById("addspace")!.addEventListener("click", () => {
    let widget = _createWidgetFromUI(WidgetTypes.Space);
    insertWidget(widget.toJSON());
    displayWidget(widget, widget_container);
    _updateSystemInfoWidgets();
  });
  document.getElementById("remove")!.addEventListener("click", () => {
    removeWidget();
  });
  document.getElementById("clear")!.addEventListener("click", () => {
    _overwriteStoredWidgets([]);
    location.reload();
  });

  let background_conf = document.getElementById(
    "background-conf"
  ) as HTMLInputElement;
  background_conf.value = getBackground();
  background_conf.addEventListener("input", (e: Event) => {
    setBackground((e.target as HTMLInputElement).value);
  });

  console.clear();
  console.warn(
    "The console is for advanced users only, only use it if you know what you're doing."
  );
  console.info(
    "You can use the following functions to manipulate the widgets list:"
  );
  console.log(
    "  newWidget(WidgetTypes.< Type >, [ Options (Object)]): Create new widget of type < Type > with options [ Options ]"
  );
  console.log(
    "  removeWidget([ Widget (HTML element) ]): Remove widget [ Widget ] or the widget added last"
  );
  console.log(
    "  exportAllSettings([ Whether to export as string (boolean) ]): Export all settings (including background) as JSON Object or String"
  );
  console.log(
    "  importAllSettings(< JSON Value (Object / String) >): Import all settings (including background) from string, that was previously exported using exportAllSettings()"
  );
  console.warn(
    "The following functions/values can be used/modified directly, however, please check the code first to understand exactly what they do."
  );
  console.log(
    "  saveAllWidgets(): Save all manual modifications to widgets (like widget options)"
  );
  console.log(
    "  widgets (Widget[]): List of all loaded widgets, can be used instead of document.getElementsByTagName\n    You will need to save modifications to widgets with saveAllWidgets()."
  );
  // TODO: Add more functions
});

function newWidget(
  type: WidgetTypes,
  options?: WidgetOptions,
  container: HTMLElement = document.getElementById("widgets")!,
  insert_pos?: number
): Widget {
  let widget = createWidget(type, options);
  insertWidget(widget, insert_pos);
  displayWidget(widget, container);
  _updateAll();
  return widget;
}

interface JSONSettings {
  widgets: JSONWidget[];
  background: string;
}
/**
 * Export all settings to JSON Object/String
 * @param string Whether to return as Object or String
 * @returns The exported JSON Object/String
 */
function exportAllSettings(string: boolean = true): JSONSettings | string {
  let json: JSONSettings = {
    widgets: getStoredWidgets()!,
    background: getBackground(),
  };
  return string ? JSON.stringify(json) : json;
}
/**
 * Import all settings from JSON Object/String
 * @param json The JSON Object/String to import from
 */
function importAllSettings(json: JSONSettings | string): void {
  if (typeof json == "string") json = JSON.parse(json) as JSONSettings;
  _overwriteStoredWidgets(json.widgets);
  setBackground(json.background);
  location.reload();
}
