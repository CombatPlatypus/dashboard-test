import assert from "node:assert/strict";
import { test } from "node:test";

import {
    STACKED_BAR_3D_DEPTH,
    createStackedBars3DPlugin,
} from "../js/reports/core/stacked-bars-3d.js";

function createDrawingContext() {
    const context = {
        faces: [],
        points: [],
        fillStyle: "",
        save() {},
        restore() {},
        beginPath() {
            this.points = [];
        },
        moveTo(x, y) {
            this.points.push({ x, y });
        },
        lineTo(x, y) {
            this.points.push({ x, y });
        },
        closePath() {},
        fill() {
            this.faces.push({
                color: this.fillStyle,
                points: this.points.map(point => ({ ...point })),
            });
        },
    };

    return context;
}

function createBar(properties) {
    return {
        getProps() {
            return properties;
        },
    };
}

test("3D empilhado desenha laterais por segmento e apenas o topo visível", () => {
    const context = createDrawingContext();
    const plugin = createStackedBars3DPlugin({
        id: "stackedTest3D",
    });

    const metadata = [
        {
            data: [
                createBar({ x: 30, y: 80, base: 140, width: 20 }),
                createBar({ x: 70, y: 60, base: 140, width: 20 }),
            ],
        },
        {
            data: [
                createBar({ x: 30, y: 40, base: 80, width: 20 }),
                createBar({ x: 70, y: 60, base: 60, width: 20 }),
            ],
        },
    ];

    const chart = {
        chartArea: { left: 0, top: 0, right: 100, bottom: 160 },
        ctx: context,
        data: {
            datasets: [
                { data: [6, 10], backgroundColor: "#ffc107" },
                { data: [3, 0], backgroundColor: "#F44336" },
            ],
        },
        isDatasetVisible: () => true,
        getDatasetMeta: index => metadata[index],
    };

    plugin.beforeDatasetDraw(chart, {
        index: 0,
        meta: metadata[0],
    });

    plugin.beforeDatasetDraw(chart, {
        index: 1,
        meta: metadata[1],
    });

    assert.equal(plugin.id, "stackedTest3D");
    assert.deepEqual(STACKED_BAR_3D_DEPTH, { x: 8, y: 7 });
    assert.deepEqual(
        context.faces.map(face => face.color),
        [
            "#947004",
            "#947004",
            "#ffd24c",
            "#8e271f",
            "#f7786e",
        ],
    );

    assert.deepEqual(
        context.faces[0].points,
        [
            { x: 40, y: 80 },
            { x: 48, y: 73 },
            { x: 48, y: 133 },
            { x: 40, y: 140 },
        ],
    );

    assert.deepEqual(
        context.faces[2].points,
        [
            { x: 60, y: 60 },
            { x: 80, y: 60 },
            { x: 88, y: 53 },
            { x: 68, y: 53 },
        ],
    );
});
