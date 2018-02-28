import * as nodeCron from "node-cron";
import { Task, LightIdValue } from "./types";
import * as lights from "./lights";
import * as config from "./configuration";

const { lightMap, taskMap } = config;

let cronTasks = [];

export function setupTasks() {
  cronTasks.forEach(cronTask => cronTask.destroy());
  cronTasks = [];

  Object.values(taskMap)
    .filter(task => task.enabled)
    .forEach((task: Task) => {
      console.log("activating task", task.id);
      cronTasks.push(
        nodeCron.schedule(task.cron, () => {
          task.lights.forEach(taskLight => {
            if (typeof taskLight.value === "number") {
              lights.dimLight(taskLight.id, taskLight.value);
            } else if (typeof taskLight.value === "string") {
              switch (taskLight.value) {
                case "ON":
                case "OFF":
                  lights.setSwitchState(taskLight.id, taskLight.value === "ON");
                  break;

                case "TOGGLE":
                  lights.toggleSwitch(taskLight.id);
                  break;

                default:
                  console.error("Unknown taskLight value", taskLight.value);
                  break;
              }
            }
          });
        })
      );
    });
}

export function addTask(
  name: string,
  cron: string,
  taskLights: LightIdValue[]
) {
  if (!nodeCron.validate(cron)) {
    console.log("tried to add invalid cron string: ", cron);
    return;
  }
  const value = { name, cron, lights: taskLights, enabled: true };
  const resultTask = config.addTask(value);
  taskMap[resultTask.id] = resultTask;
  setupTasks();
}

export function toggleTaskEnabled(id: string) {
  if (!taskMap[id]) {
    return;
  }
  const task = taskMap[id];
  task.enabled = !task.enabled;
  config.updateTask(task);
  setupTasks();
}

export function removeTask(id: string) {
  if (!taskMap[id]) {
    return;
  }
  config.removeTask(id);
  delete taskMap[id];
  setupTasks();
}
