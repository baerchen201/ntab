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

class _WidgetConfigs extends HTMLElement {
  /** The associated widget */
  widget: Widget;
  constructor(widget: Widget) {
    super();
    this.widget = widget;
    document.getElementById("widget-configs")!.appendChild(this);

    let header = document.createElement("h3");
    header.innerText = WidgetNames[widget.type];

    this.appendChild(header);

    let delete_button = document.createElement("button"),
      delete_icon = document.createElement("img");
    delete_icon.src = "img/trash-can-regular.svg";
    delete_button.appendChild(delete_icon);
    delete_button.classList.add("delete");
    delete_button.addEventListener("click", () => {
      removeWidget(this.widget);
    });

    this.appendChild(delete_button);
  }

  register(
    type: BooleanConstructor | { [key: string]: string },
    callback: string | ((value: any) => void),
    get: string | (() => any),
    name: string,
    long_name?: string
  ) {
    if (typeof callback == "string") {
      let opt_name: string = callback;
      callback = (value: any) => {
        this.widget.options[opt_name] = value;
        _update(this.widget.type);
      };
    }
    if (typeof get == "string") {
      let opt_name: string = get;
      get = () => this.widget.options[opt_name];
    }
    if (!long_name) {
      long_name = name;
    }

    if (type == Boolean) {
      let root: HTMLDivElement = document.createElement("div"),
        checkbox: HTMLInputElement = document.createElement("input"),
        label: HTMLLabelElement = document.createElement("label");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(get());
      checkbox.addEventListener("change", () => {
        callback(checkbox.checked);
        _update(this.widget.type);
        saveAllWidgets();
      });

      label.innerText = long_name;
      checkbox.name = name;
      label.htmlFor = checkbox.name;

      root.appendChild(label);
      root.appendChild(checkbox);
      this.appendChild(root);
    } else if (typeof type == "object") {
      let root: HTMLDivElement = document.createElement("div"),
        label: HTMLLabelElement = document.createElement("label"),
        select: HTMLSelectElement = document.createElement("select");
      Object.keys(type).forEach((key) => {
        let option = document.createElement("option");
        option.value = key;
        option.label = type[key];
        select.appendChild(option);
      });
      select.value = get();
      select.addEventListener("change", () => {
        callback(select.value);
        _update(this.widget.type);
        saveAllWidgets();
      });

      label.innerText = long_name;
      select.name = name;
      label.htmlFor = select.name;

      root.appendChild(label);
      root.appendChild(select);
      this.appendChild(root);
    }
  }
}
window.customElements.define("widget-config", _WidgetConfigs);

/**
 * Base Widget class
 */
class Widget extends HTMLElement {
  /** The type of widget */
  type: number;
  /** The widget options */
  options: WidgetOptions = {};
  /** The HTML Element containing the widget options GUI */
  configs: _WidgetConfigs;

  constructor(type: number, options: WidgetOptions = {}) {
    super();

    this.type = type;
    this.classList.add("widget-" + this.type.toString());
    this.options = options;
    this.configs = new _WidgetConfigs(this);

    this.innerText = JSON.stringify(this.toJSON());
  }

  static fromJSON(json: JSONWidget): Widget {
    return createWidget(json.type, json.options);
  }

  toJSON(): JSONWidget {
    return { type: this.type, options: this.options };
  }

  remove() {
    super.remove();
    this.configs.remove();
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
enum WidgetNames {
  Generic,
  Time,
  Date,
  Ip,
  "Static Text",
  "Editable Text",
  "Empty Space",
  Greeting,
  "Custom CSS",
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
function _updateNetworkWidgets() {
  fetch("https://www.gogeoip.com/json/?user")
    .then(async (response) => {
      let network_info = await response.json();
      ipWidgets.forEach((widget) => {
        try {
          let out: string[] = [network_info["network"]["ip"]];
          if (widget.options["city"])
            out.push(network_info["location"]["city"]);
          if (widget.options["region"])
            out.push(network_info["location"]["region_name"]);
          if (widget.options["country"])
            out.push(network_info["location"]["country"]["name"]);
          widget.innerText = out.join(", ");
        } catch {
          widget.innerText =
            "An unexpected error occurred while updating the network information";
        }
      });
    })
    .catch(() => {
      ipWidgets.forEach((widget) => {
        widget.innerText = "No network information";
      });
    });
}

function _update(widget_type?: WidgetTypes) {
  switch (widget_type) {
    case WidgetTypes.Time:
      _updateTimeWidgets();
      break;
    case WidgetTypes.Date:
      _updateDateWidgets();
      break;
    case WidgetTypes.Ip:
      _updateNetworkWidgets();

    default:
      _updateTimeWidgets();
      _updateDateWidgets();
      break;
  }
}

const widgets: Widget[] = [];

function saveAllWidgets() {
  let json_widgets: JSONWidget[] = [];
  widgets.forEach((widget) => {
    json_widgets.push(widget.toJSON());
  });
  _storeJSONWidgets(json_widgets);
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
      widget.configs.register(
        { de: "24h", us: "12h" },
        "format",
        "format",
        "format",
        "Clock format"
      );
      break;
    case WidgetTypes.Date:
      dateWidgets.push(widget);
      widget.configs.register(
        { de: "DD.MM.YYYY", us: "MM/DD/YYYY" },
        "format",
        "format",
        "format",
        "Date format"
      );
      break;
    case WidgetTypes.Ip:
      widget.innerText = "Loading...";
      ipWidgets.push(widget);
      widget.configs.register(Boolean, "city", "city", "city", "Display city");
      widget.configs.register(
        Boolean,
        "region",
        "region",
        "region",
        "Display region"
      );
      widget.configs.register(
        Boolean,
        "country",
        "country",
        "country",
        "Display coutry"
      );
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

  _displayWidget(widget);
  _update(widget.type);
  saveAllWidgets();

  return widget;
}
function removeWidget(widget?: Widget | number): void {
  if (
    !widgets.length ||
    (typeof widget == "number" && widgets.length <= widget)
  )
    return console.error("Invalid widget");
  let index: number;
  if (widget == undefined)
    (index = widgets.length - 1), (widget = widgets[index]);
  else if (typeof widget == "number")
    (index = widget), (widget = widgets[index]);
  else index = widgets.indexOf(widget);
  widget.remove();
  widgets.splice(index, 1);
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
function _getStoredWidgets(): JSONWidget[] {
  let json: string | null = localStorage.getItem("widgets");
  if (!json) _storeJSONWidgets([]);
  try {
    return JSON.parse(json == null ? "[]" : json);
  } catch (e) {
    return _storeJSONWidgets([]); // TODO: Add warning
  }
}

function _storeJSONWidgets(widgets: JSONWidget[]): JSONWidget[] {
  localStorage.setItem("widgets", JSON.stringify(widgets));
  return widgets;
}

function _displayWidget(widget: Widget) {
  document.getElementById("widgets")!.appendChild(widget);
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

setBackground(getBackground()); //? Not sure if I should put this into window.onload, it should be just fine like this, and shorten the flash of white background.

window.addEventListener("load", () => {
  _getStoredWidgets()!.forEach((json: JSONWidget) => {
    Widget.fromJSON(json);
  });

  let addwidget: HTMLSelectElement = document.getElementById(
    "addwidget"
  ) as HTMLSelectElement;
  addwidget.addEventListener("change", () => {
    // @ts-ignore Just add the values in the HTML correctly
    createWidget(WidgetTypes[addwidget.value]);
    addwidget.selectedIndex = 0;
  });
  addwidget.selectedIndex = 0;
  for (let i = 0; i < Object.keys(WidgetTypes).length / 2; i++) {
    let option = document.createElement("option");
    option.value = WidgetTypes[i];
    option.innerText = WidgetNames[i];
    addwidget.appendChild(option);
  }
});

function help() {
  console.warn(
    "The console is for advanced users only, only use it if you know what you're doing."
  );
  console.info(
    "You can use the following functions to manipulate the widgets list:"
  );
  console.log(
    "  createWidget(< Type (number, use WidgetTypes) >, [ Options (Object) ]): Create new widget of type < Type > with options [ Options ]"
  );
  console.log(
    "  removeWidget([ Widget (HTML element, number (as array index)) ]): Remove widget [ Widget ] or the widget added last"
  );
  console.log(
    "  exportAllSettings([ string (boolean) ]): Export all settings (including background) as JSON Object or String"
  );
  console.log(
    "  importAllSettings(< JSON Value (Object / String) >): Import all settings (including background) from string, that was previously exported using exportAllSettings()"
  );
  console.warn(
    "The following functions/values can be used/modified directly, however, please check the code first to understand exactly what they do."
  );
  console.log(
    "  widgets (Widget[]): List of all loaded widgets, can be used instead of document.getElementsByTagName\n    You will need to save direct modifications with saveAllWidgets()."
  );
  console.log(
    "  saveAllWidgets(): Save all manual modifications to widgets (like widget options)"
  );
  // TODO: Add more functions
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
    widgets: _getStoredWidgets()!,
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
  _storeJSONWidgets(json.widgets);
  setBackground(json.background);
  location.reload();
}
