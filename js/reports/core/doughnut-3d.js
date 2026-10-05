const fullCircle = Math.PI * 2;
const startAngle = -Math.PI / 2;
const ellipseScale = 0.7;

function createDoughnut3DGeometry(area) {
    if (!area) {
        return null;
    }

    const width = area.right - area.left;
    const height = area.bottom - area.top;

    if (!Number.isFinite(width) || !Number.isFinite(height) ||
        width <= 40 || height <= 40) {
        return null;
    }

    // Reserve room for the projected thickness and its shadow, even on resize.
    const outerRadius = Math.min(
        (width - 36) / 2,
        (height - 40) / (2 * ellipseScale + 0.16),
        165,
    );
    const depth = outerRadius * 0.16;
    const centerY = (area.top + area.bottom - depth) / 2;

    return {
        centerX: (area.left + area.right) / 2,
        centerY,
        textCenterY: centerY + depth * 0.45,
        outerRadius,
        innerRadius: outerRadius * 0.66,
        ellipseScale,
        depth,
    };
}

function createDoughnut3DSegments(values) {
    const amounts = (Array.isArray(values) ? values : []).map(value => {
        const amount = Number(value);
        return Number.isFinite(amount) && amount > 0 ? amount : 0;
    });
    const total = amounts.reduce((sum, value) => sum + value, 0);

    if (!Number.isFinite(total) || total <= 0) {
        return [];
    }

    let angle = startAngle;

    return amounts.flatMap((value, index) => {
        if (value === 0) {
            return [];
        }

        const segment = {
            index,
            startAngle: angle,
            endAngle: angle + value / total * fullCircle,
        };
        angle = segment.endAngle;
        return [segment];
    });
}

function shadeColor(color, amount) {
    const channels = color.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16));
    const target = amount > 0 ? 255 : 0;
    const strength = Math.abs(amount);

    return `rgb(${channels.map(value => Math.round(
        value + (target - value) * strength,
    )).join(", ")})`;
}

function traceSegment(context, geometry, segment, offset = 0) {
    const { centerX, centerY, outerRadius, innerRadius, ellipseScale } = geometry;
    const y = centerY + offset;

    context.beginPath();
    context.ellipse(centerX, y, outerRadius, outerRadius * ellipseScale,
        0, segment.startAngle, segment.endAngle);
    context.ellipse(centerX, y, innerRadius, innerRadius * ellipseScale,
        0, segment.endAngle, segment.startAngle, true);
    context.closePath();
}

function drawDoughnut3D({ context, area, values, colors }) {
    const geometry = createDoughnut3DGeometry(area);

    if (!geometry) {
        return null;
    }

    const segments = createDoughnut3DSegments(values);
    const hasData = segments.length > 0;
    const visibleSegments = hasData ? segments : [{
        index: 0,
        startAngle,
        endAngle: startAngle + fullCircle,
    }];
    const getColor = segment => hasData
        ? colors?.[segment.index] ?? "#3f51b5"
        : "#393c46";
    const { centerX, centerY, outerRadius, innerRadius, ellipseScale, depth } = geometry;

    context.save();

    // The entire effect is rasterized into the canvas: no CSS 3D transform is
    // needed, so html2canvas exports the same projection as the live report.
    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.45)";
    context.shadowBlur = 14;
    context.shadowOffsetY = 7;
    context.fillStyle = "rgba(0, 0, 0, 0.25)";
    traceSegment(context, geometry, {
        startAngle,
        endAngle: startAngle + fullCircle,
    }, depth);
    context.fill();
    context.restore();

    // Bottom-to-top annular layers produce both the outer front wall and the
    // visible rear wall inside the hole, without gaps or reversed slice order.
    const layers = Math.ceil(depth);
    for (let layer = layers; layer > 0; layer -= 1) {
        const offset = depth * layer / layers;
        visibleSegments.forEach(segment => {
            const color = getColor(segment);
            const shading = context.createLinearGradient(
                centerX - outerRadius, centerY,
                centerX + outerRadius, centerY,
            );
            const darkness = -0.28 - 0.2 * layer / layers;
            shading.addColorStop(0, shadeColor(color, darkness - 0.1));
            shading.addColorStop(0.5, shadeColor(color, darkness));
            shading.addColorStop(1, shadeColor(color, darkness - 0.1));
            context.fillStyle = shading;
            traceSegment(context, geometry, segment, offset);
            context.fill();
        });
    }

    visibleSegments.forEach(segment => {
        const color = getColor(segment);
        const surface = context.createLinearGradient(
            centerX, centerY - outerRadius * ellipseScale,
            centerX, centerY + outerRadius * ellipseScale,
        );
        surface.addColorStop(0, shadeColor(color, 0.2));
        surface.addColorStop(0.5, color);
        surface.addColorStop(1, shadeColor(color, -0.08));
        context.fillStyle = surface;
        traceSegment(context, geometry, segment);
        context.fill();

        context.strokeStyle = "rgba(255, 255, 255, 0.14)";
        context.lineWidth = 0.75;
        [outerRadius, innerRadius].forEach(radius => {
            context.beginPath();
            context.ellipse(centerX, centerY, radius, radius * ellipseScale,
                0, segment.startAngle, segment.endAngle);
            context.stroke();
        });
    });

    context.restore();
    return geometry;
}

export {
    createDoughnut3DGeometry,
    createDoughnut3DSegments,
    drawDoughnut3D,
};
