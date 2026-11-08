import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    smoke: { executor: "constant-vus", vus: 5, duration: "30s" },
  },
};

export default function () {
  const response = http.get(`${__ENV.API_URL || "http://localhost:8000"}/health`);
  check(response, { "health endpoint is 200": (result) => result.status === 200 });
  sleep(1);
}
