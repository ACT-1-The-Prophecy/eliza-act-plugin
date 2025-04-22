"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskState = void 0;
var TaskState;
(function (TaskState) {
    TaskState[TaskState["PENDING"] = 0] = "PENDING";
    TaskState[TaskState["INVITED"] = 1] = "INVITED";
    TaskState[TaskState["ASSIGNED"] = 2] = "ASSIGNED";
    TaskState[TaskState["COMPLETED"] = 3] = "COMPLETED";
    TaskState[TaskState["DELETED"] = 4] = "DELETED";
    TaskState[TaskState["SUBMITTED"] = 5] = "SUBMITTED";
    TaskState[TaskState["VALIDATED"] = 6] = "VALIDATED";
    TaskState[TaskState["DECLINED_BY_OWNER"] = 7] = "DECLINED_BY_OWNER";
    TaskState[TaskState["DECLINED_BY_VALIDATOR"] = 8] = "DECLINED_BY_VALIDATOR";
    TaskState[TaskState["DISPUTED_BY_OWNER"] = 9] = "DISPUTED_BY_OWNER";
    TaskState[TaskState["DISPUTED_BY_AGENT"] = 10] = "DISPUTED_BY_AGENT";
    TaskState[TaskState["RESOLVED"] = 11] = "RESOLVED";
    TaskState[TaskState["EXPIRED"] = 12] = "EXPIRED";
})(TaskState || (exports.TaskState = TaskState = {}));
//# sourceMappingURL=market.types.js.map