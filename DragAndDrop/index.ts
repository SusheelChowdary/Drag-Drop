//Created by : Suseel Chowdary Ratakonda
//Email : r.susheel.2009@gmail.com
/* eslint no-use-before-define: 0 */  // --> OFF
import { stat } from "fs";
import { IInputs, IOutputs } from "./generated/ManifestTypes";

import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
var groupArray = require("group-array");
type DataSet = ComponentFramework.PropertyTypes.DataSet;
/* eslint no-unused-vars : "off" */
export class DragAndDrop
  implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  /**
   * Empty constructor.
   */
  constructor() {}

  /**
   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
   * Data-set values are not initialized here, use updateView.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
   * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
   */
  private contextObj: ComponentFramework.Context<IInputs>;
  // Div element created as part of this control's main container
  private mainContainer: HTMLDivElement;
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ) {
    context.mode.trackContainerResize(true);
    // Add control initialization code
    this.mainContainer = document.createElement("div");
    this.mainContainer.id = "DargAndDrop";
    container.appendChild(this.mainContainer);
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.mainContainer.innerHTML = "";
    this.contextObj = context;
    if (!context.parameters.DataSet.loading) {
      // Get sorted columns on View
      let statusColums = this.getDiffrentStatusColums(context);
      let availablecolumns = this.getSortedColumnsOnView(context);
      let groupbyStatusItems = this.groupByStatus(context, statusColums);
      console.log(groupbyStatusItems);
      if (statusColums.length > 0) {
        groupbyStatusItems.forEach((element) => {
          var statusName = element.Name.split(":")[0];
          var statusValue = element.Name.split(":")[1];
          var statuDiv = document.createElement("div");
          statuDiv.className = "status";
          statuDiv.style.width = (1 / statusColums.length) * 100 - 1 + "%";
          statuDiv.id = statusValue;
          statuDiv.innerHTML = "<h1>" + statusName + "</h1>";
          var records = element.Records;
          records.forEach(
            (record: {
              getRecordId: () => string;
              getFormattedValue: (arg0: string) => string;
            }) => {
              var columnelement = document.createElement("div");
              columnelement.className = "column";
              columnelement.id = record.getRecordId();
              columnelement.draggable = true;
              var cardElement = document.createElement("div");
              cardElement.className = "card";
              availablecolumns.forEach((column) => {
                if (availablecolumns[0] == column && column.name!="statuscode") {
                  cardElement.innerHTML +=
                    "<h3>" + record.getFormattedValue(column.name);
                  +"</h3>";
                } else if(column.name !="statuscode") {
                  cardElement.innerHTML +=
                    "<p>" +
                    column.displayName +
                    " : " +
                    record.getFormattedValue(column.name);
                  +"</p>";
                }
              });
              columnelement.appendChild(cardElement);
              statuDiv.appendChild(columnelement);
            }
          );
          this.mainContainer.appendChild(statuDiv);
        });
        this.draggableFunctions(context);
      }
    }
  }
  draggableFunctions(context: ComponentFramework.Context<IInputs>) {
    const draggables = document.querySelectorAll(".column");
    const containers = document.querySelectorAll(".status");

    draggables.forEach((draggable) => {
      draggable.addEventListener("dragstart", () => {
        draggable.classList.add("dragging");
      });

      draggable.addEventListener("dragend", () => {
        draggable.classList.remove("dragging");
      });
    });
    containers.forEach((container) => {
      container.addEventListener("dragover", (e) => {
        e.preventDefault();
        const draggable = document.querySelector(".dragging");
        if (draggable != null) {
          container.appendChild(draggable);
          this.callWebApi(context, container.id, draggable.id);
        }
      });
    });
  }
  callWebApi(
    context: ComponentFramework.Context<IInputs>,
    statusid: string,
    recordid: string
  ) {
    var entityName = context.parameters.DataSet.getTargetEntityType();
    var data: any = {};
    data["statuscode"] = parseInt(statusid);
    context.webAPI.updateRecord(entityName, recordid, data).then
	(
		function (response: any) 
		{
            console.log(response);

		},
		function (errorResponse: any) 
		{
			// Error handling code here - record failed to be created
			console.log(errorResponse);
		}
	);
  }

  private getSortedColumnsOnView(
    context: ComponentFramework.Context<IInputs>
  ): DataSetInterfaces.Column[] {
    if (!context.parameters.DataSet.columns) {
      return [];
    }

    let columns = context.parameters.DataSet.columns.filter(function (
      columnItem: DataSetInterfaces.Column
    ) {
      // some column are supplementary and their order is not > 0
      return columnItem.order >= 0;
    });

    // Sort those columns so that they will be rendered in order
    columns.sort(function (
      a: DataSetInterfaces.Column,
      b: DataSetInterfaces.Column
    ) {
      return a.order - b.order;
    });

    return columns;
  }

  groupByStatus(
    context: ComponentFramework.Context<IInputs>,
    statusColums: Array<String>
  ) {
    var groupedData = new Array();
    this.contextObj = context;
    var diffrentStatus = new Array();
    if (!context.parameters.DataSet.columns) {
      return [];
    }

    var gridParam = context.parameters.DataSet;
    if (gridParam.sortedRecordIds.length > 0) {
      var groupbyData = {};

      statusColums.forEach((element) => {
        var formmatedValue = element.split(":")[0];
        var groupByStatus = new Array();
        for (let currentRecordId of gridParam.sortedRecordIds) {
          if (
            gridParam.records[currentRecordId].getFormattedValue(
              "statuscode"
            ) == formmatedValue
          ) {
            groupByStatus.push(gridParam.records[currentRecordId]);
          }
        }
        var groupByelemnt = { Name: element, Records: groupByStatus };
        groupedData.push(groupByelemnt);
      });
    }
    return groupedData;
  }
  getDiffrentStatusColums(context: ComponentFramework.Context<IInputs>) {
    this.contextObj = context;
    var diffrentStatus = new Array();
    if (!context.parameters.DataSet.columns) {
      return [];
    }

    var gridParam = context.parameters.DataSet;
    if (gridParam.sortedRecordIds.length > 0) {
      for (let currentRecordId of gridParam.sortedRecordIds) {
        diffrentStatus.push(
          gridParam.records[currentRecordId].getFormattedValue("statuscode") +
            ":" +
            gridParam.records[currentRecordId].getValue("statuscode")
        );
      }
    }
    const distinctStatus = diffrentStatus.filter(
      (n, i) => diffrentStatus.indexOf(n) === i
    );

    return distinctStatus;
  }

  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
   */
  public getOutputs(): IOutputs {
    return {};
  }

  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    // Add code to cleanup control if necessary
  }
}
