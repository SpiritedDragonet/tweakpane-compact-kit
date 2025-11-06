import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
from matplotlib.patches import FancyArrowPatch
from mpl_toolkits.mplot3d import proj3d
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import matplotlib.image as mpimg

class Arrow3D(FancyArrowPatch):
    def __init__(self, xs, ys, zs, *args, **kwargs):
        FancyArrowPatch.__init__(self, (0,0), (0,0), *args, **kwargs)
        self._verts3d = xs, ys, zs

    def do_3d_projection(self, renderer=None):
        xs3d, ys3d, zs3d = self._verts3d
        xs, ys, zs = proj3d.proj_transform(xs3d, ys3d, zs3d, self.axes.M)
        self.set_positions((xs[0],ys[0]),(xs[1],ys[1]))
        return np.min(zs)

def create_3d_axis_icon(output_path='3d_axis_icon.png', format='png', size=(400, 400), dpi=150,
                        normal_axis=None, dim_alpha=0.35,
                        guide_to=None, guide_color='#222222',
                        guide_lw_main=3.0, guide_lw_aux=2.2,
                        guide_style_main='-', guide_style_aux='--',
                        guide_alpha_main=1.0, guide_alpha_aux=0.6,
                        parallelogram=None,
                        extra_guides=None):
    """
    生成专业的3D坐标轴图标
    
    参数:
    output_path: 输出文件路径
    format: 输出格式 ('png', 'svg')
    size: 图像尺寸 (width, height)
    dpi: 分辨率
    """
    
    # 创建图形和3D轴
    fig = plt.figure(figsize=(size[0]/dpi, size[1]/dpi), dpi=dpi)
    ax = fig.add_subplot(111, projection='3d')
    
    # 设置视角 (稍微调整角度，更接近CAD三向标)
    ax.view_init(elev=24, azim=-35)
    try:
        ax.set_proj_type('persp')
    except Exception:
        pass
    try:
        ax.set_box_aspect((1, 1, 1))
    except Exception:
        pass
    
    # 坐标轴箭头长度（>1 表示比单位长度稍长）；单位长度坐标(0/1)保持不变
    axis_length = 1.15
    
    # 定义颜色 (AutoCAD风格)
    colors = {
        'x': '#FF0000',  # 红色 X轴
        'y': '#00FF00',  # 绿色 Y轴  
        'z': '#0000FF'   # 蓝色 Z轴
    }
    
    # 绘制坐标轴箭头（每个轴单独设置透明度）
    arrow_props = dict(
        arrowstyle='->', 
        lw=3, 
        mutation_scale=20,
    )
    
    # 每个轴的透明度
    if normal_axis is None:
        alpha_x = alpha_y = alpha_z = 1.0
    elif isinstance(normal_axis, str) and normal_axis.lower() in ('all_dim', 'dim_all', 'none'):
        alpha_x = alpha_y = alpha_z = dim_alpha
    else:
        na = str(normal_axis).lower()
        alpha_x = 1.0 if na == 'x' else dim_alpha
        alpha_y = 1.0 if na == 'y' else dim_alpha
        alpha_z = 1.0 if na == 'z' else dim_alpha

    # X轴
    arrow_x = Arrow3D([0, axis_length], [0, 0], [0, 0], 
                      color=colors['x'], alpha=alpha_x, **arrow_props)
    ax.add_artist(arrow_x)
    
    # Y轴
    arrow_y = Arrow3D([0, 0], [0, axis_length], [0, 0], 
                      color=colors['y'], alpha=alpha_y, **arrow_props)
    ax.add_artist(arrow_y)
    
    # Z轴
    arrow_z = Arrow3D([0, 0], [0, 0], [0, axis_length], 
                      color=colors['z'], alpha=alpha_z, **arrow_props)
    ax.add_artist(arrow_z)
    
    # 添加轴标签（放在箭头稍外）
    label_offset = 1.08
    ax.text(axis_length * label_offset, 0, 0, 'X', 
            color=colors['x'], fontsize=16, fontweight='bold', ha='center', alpha=alpha_x)
    ax.text(0, axis_length * label_offset, 0, 'Y', 
            color=colors['y'], fontsize=16, fontweight='bold', ha='center', alpha=alpha_y)
    ax.text(0, 0, axis_length * label_offset, 'Z', 
            color=colors['z'], fontsize=16, fontweight='bold', ha='center', alpha=alpha_z)
    
    # 在原点添加小球
    ax.scatter([0], [0], [0], color='black', s=50, alpha=0.8)

    # 指引线：主线为不透明实线；附加两条虚线
    if guide_to is not None:
        try:
            gx, gy, gz = guide_to
        except Exception:
            gx, gy, gz = 0.0, 0.0, 0.0

        # 主引导线：原点 -> 目标点（实线，不透明）
        ax.plot([0, gx], [0, gy], [0, gz],
                color=guide_color, alpha=guide_alpha_main, lw=guide_lw_main,
                linestyle=guide_style_main)

        # 附加虚线：从两个相应的单位点到目标点
        # 仅当目标是(1,1,0)/(1,0,1)/(0,1,1)这种二进制两位为1时添加
        target = (float(gx), float(gy), float(gz))
        ones_axes = [i for i, v in enumerate(target) if abs(v - 1.0) < 1e-9]
        zeros_axes = [i for i, v in enumerate(target) if abs(v - 0.0) < 1e-9]
        if len(ones_axes) == 2 and len(zeros_axes) == 1:
            # 对于每个为1的轴，构造对应单位点作为起点
            for ax_idx in ones_axes:
                if ax_idx == 0:
                    sx, sy, sz = 1.0, 0.0, 0.0
                elif ax_idx == 1:
                    sx, sy, sz = 0.0, 1.0, 0.0
                else:
                    sx, sy, sz = 0.0, 0.0, 1.0
                ax.plot([sx, gx], [sy, gy], [sz, gz],
                        color=guide_color, alpha=guide_alpha_aux, lw=guide_lw_aux,
                        linestyle=guide_style_aux)

        # 其他自定义附加引导线（使用辅助线样式）
        if extra_guides:
            for (sx, sy, sz), (ex, ey, ez) in extra_guides:
                ax.plot([sx, ex], [sy, ey], [sz, ez],
                        color=guide_color, alpha=guide_alpha_aux, lw=guide_lw_aux,
                        linestyle=guide_style_aux)
    
    # 设置坐标轴范围（给箭头与标签留出余量）
    limit = max(1.35, axis_length * 1.15)
    ax.set_xlim([-0.1, limit])
    ax.set_ylim([-0.1, limit])
    ax.set_zlim([-0.1, limit])
    
    # 隐藏坐标轴刻度和网格
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_zticks([])
    ax.grid(False)

    # 去掉三个黑色框框（3D坐标轴的盒子/窗格/边）
    try:
        ax.set_axis_off()
    except Exception:
        pass
    for axis in (ax.xaxis, ax.yaxis, ax.zaxis):
        try:
            axis.pane.fill = False
            axis.pane.set_edgecolor('none')
        except Exception:
            pass
    try:
        ax.w_xaxis.line.set_visible(False)
        ax.w_yaxis.line.set_visible(False)
        ax.w_zaxis.line.set_visible(False)
    except Exception:
        pass
    
    # 设置背景透明
    fig.patch.set_alpha(0)
    ax.patch.set_alpha(0)
    try:
        plt.axis('off')
    except Exception:
        pass

    # 平行四边形（使用两个向量 v1/v2 张成的面），描边虚线，内部浅黄色半透明
    if parallelogram is not None:
        v1 = parallelogram.get('v1', (0, 0, 0))
        v2 = parallelogram.get('v2', (0, 0, 0))
        fill_color = parallelogram.get('fill_color', '#fff6b3')
        fill_alpha = parallelogram.get('fill_alpha', 0.35)
        edge_color = parallelogram.get('edge_color', '#b8860b')
        edge_style = parallelogram.get('edge_style', '--')
        edge_lw = parallelogram.get('edge_lw', 2.2)
        edge_alpha = parallelogram.get('edge_alpha', 0.6)  # 虚线半透明
        skip_axis_edges = parallelogram.get('skip_axis_edges', True)

        def is_unit_axis(pt):
            return tuple(pt) in {(1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)}

        O = (0.0, 0.0, 0.0)
        A = (float(v1[0]), float(v1[1]), float(v1[2]))
        D = (float(v2[0]), float(v2[1]), float(v2[2]))
        B = (A[0] + D[0], A[1] + D[1], A[2] + D[2])

        verts = [[O, A, B, D]]
        poly = Poly3DCollection(verts, facecolors=fill_color, edgecolors='none', linewidths=0, alpha=fill_alpha)
        ax.add_collection3d(poly)

        # 需要描虚线的边（跳过与坐标轴重合的 O->unit edges）
        edges = [
            (O, A),
            (A, B),
            (B, D),
            (D, O),
        ]
        for (p, q) in edges:
            skip = False
            if skip_axis_edges:
                # 判断是否与坐标轴重合（仅 O->单位向量 这两条边）
                if p == O and is_unit_axis(q):
                    skip = True
                if q == O and is_unit_axis(p):
                    skip = True
            if not skip:
                ax.plot([p[0], q[0]], [p[1], q[1]], [p[2], q[2]],
                        color=edge_color, linestyle=edge_style, lw=edge_lw, alpha=edge_alpha)
    
    # 调整布局
    plt.tight_layout()
    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    
    # 保存文件
    if format.lower() == 'svg':
        output_path = output_path.replace('.png', '.svg')
        plt.savefig(output_path, format='svg', transparent=True, 
                   bbox_inches='tight', pad_inches=0)
    else:
        plt.savefig(output_path, format='png', transparent=True, 
                   bbox_inches='tight', pad_inches=0, dpi=dpi)
    
    plt.close()
    print(f"3D坐标轴图标已保存到: {output_path}")


def _save_both(base_name: str, **kwargs) -> None:
    """Helper: save both PNG and SVG for same drawing params."""
    create_3d_axis_icon(base_name + '.png', format='png', **kwargs)
    create_3d_axis_icon(base_name + '.svg', format='svg', **kwargs)

def create_multiple_styles():
    """生成多种风格的坐标轴图标"""
    
    # 标准风格（PNG + SVG）
    _save_both('axis_standard', size=(400, 400))
    
    # 高分辨率版本（PNG + SVG）
    _save_both('axis_hires', size=(800, 800), dpi=300)
    
    print("已生成多种格式的坐标轴图标")


def create_focus_variants():
    """生成三张：突出X/突出Y/突出Z 的图"""
    _save_both('axis_focus_x', size=(400, 400), normal_axis='x', dim_alpha=0.35)
    _save_both('axis_focus_y', size=(400, 400), normal_axis='y', dim_alpha=0.35)
    _save_both('axis_focus_z', size=(400, 400), normal_axis='z', dim_alpha=0.35)


def create_all_dim_with_guides():
    """生成三张：XYZ都半透明，但各自包含一条从原点到指定点的不透明虚线。

    - 到 (0,1,1)  -> axis_dim_011.png
    - 到 (1,0,1)  -> axis_dim_101.png
    - 到 (1,1,0)  -> axis_dim_110.png
    """
    _save_both('axis_dim_011', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               guide_to=(0, 1, 1), guide_color='#b8860b')
    _save_both('axis_dim_101', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               guide_to=(1, 0, 1), guide_color='#b8860b')
    _save_both('axis_dim_110', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               guide_to=(1, 1, 0), guide_color='#b8860b')


def create_parallelogram_variants():
    """生成三张：XYZ轴都半��明，并在以下由两个单位向量张成的平面上绘制平行四边形：
    - (0,0,1) 与 (0,1,0)   -> YZ 面片
    - (0,1,0) 与 (1,0,0)   -> XY 面片
    - (1,0,0) 与 (0,0,1)   -> XZ 面片

    边界使用虚线（与坐标轴重合的边可省略），内部浅黄色半透明填充。
    """
    # YZ 面：001 & 010
    _save_both('axis_plane_001_010', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               parallelogram=dict(
                   v1=(0, 0, 1), v2=(0, 1, 0),
                   fill_color='#fff6b3', fill_alpha=0.35,
                   edge_color='#b8860b', edge_style='--', edge_lw=2.2,
                   skip_axis_edges=True,
               ))

    # XY 面：010 & 100
    _save_both('axis_plane_010_100', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               parallelogram=dict(
                   v1=(0, 1, 0), v2=(1, 0, 0),
                   fill_color='#fff6b3', fill_alpha=0.35,
                   edge_color='#b8860b', edge_style='--', edge_lw=2.2,
                   skip_axis_edges=True,
               ))

    # XZ 面：100 & 001
    _save_both('axis_plane_100_001', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               parallelogram=dict(
                   v1=(1, 0, 0), v2=(0, 0, 1),
                   fill_color='#fff6b3', fill_alpha=0.35,
                   edge_color='#b8860b', edge_style='--', edge_lw=2.2,
                   skip_axis_edges=True,
               ))


def create_parallelogram_variants_composite():
    """生成三张：XYZ轴都半透明，并在以下由两向量（一个轴向单位向量+一个对角向量）张成的平面上绘制平行四边形：
    - (0,1,1) 与 (1,0,0)   -> 含 YZ 对角 + X 轴
    - (1,0,1) 与 (0,1,0)   -> 含 XZ 对角 + Y 轴
    - (1,1,0) 与 (0,0,1)   -> 含 XY 对角 + Z 轴

    边界使用虚线（与坐标轴重合的边可省略），内部浅黄色半透明填充。
    """
    # 011 & 100
    _save_both('axis_plane_011_100', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               parallelogram=dict(
                   v1=(0, 1, 1), v2=(1, 0, 0),
                   fill_color='#fff6b3', fill_alpha=0.35,
                   edge_color='#b8860b', edge_style='--', edge_lw=2.2,
                   skip_axis_edges=True,
               ))

    # 101 & 010
    _save_both('axis_plane_101_010', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               parallelogram=dict(
                   v1=(1, 0, 1), v2=(0, 1, 0),
                   fill_color='#fff6b3', fill_alpha=0.35,
                   edge_color='#b8860b', edge_style='--', edge_lw=2.2,
                   skip_axis_edges=True,
               ))

    # 110 & 001
    _save_both('axis_plane_110_001', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               parallelogram=dict(
                   v1=(1, 1, 0), v2=(0, 0, 1),
                   fill_color='#fff6b3', fill_alpha=0.35,
                   edge_color='#b8860b', edge_style='--', edge_lw=2.2,
                   skip_axis_edges=True,
               ))


def create_space_diagonal_variant():
    """XYZ轴半透明；添加一条 000→111 的黑色实线和三条虚线：
    100→111, 010→111, 001→111。
    """
    extra = [
        ((1, 0, 0), (1, 1, 1)),
        ((0, 1, 0), (1, 1, 1)),
        ((0, 0, 1), (1, 1, 1)),
    ]
    _save_both('axis_diag_111', size=(400, 400), normal_axis='all_dim', dim_alpha=0.35,
               guide_to=(1, 1, 1), guide_color='#b8860b',
               guide_lw_main=3.0, guide_style_main='-',
               guide_lw_aux=2.2, guide_style_aux='--',
               extra_guides=extra)


def create_reference_grid():
    """生成参考拼图：把13个图标按顺序摆放成四排，淡灰色背景。

    顺序与前面生成一致：
      1) axis_focus_x, axis_focus_y, axis_focus_z, axis_diag_111
      2) axis_dim_011, axis_dim_101, axis_dim_110
      3) axis_plane_001_010, axis_plane_010_100, axis_plane_100_001
      4) axis_plane_011_100, axis_plane_101_010, axis_plane_110_001
    """
    names = [
        'axis_focus_x', 'axis_focus_y', 'axis_focus_z', 'axis_diag_111',
        'axis_dim_011', 'axis_dim_101', 'axis_dim_110',
        'axis_plane_001_010', 'axis_plane_010_100', 'axis_plane_100_001',
        'axis_plane_011_100', 'axis_plane_101_010', 'axis_plane_110_001',
    ]

    # 4x4 网格，最后3个单元为空
    bg = '#eeeeee'
    fig, axes = plt.subplots(nrows=4, ncols=4, figsize=(12, 12), dpi=150)
    fig.patch.set_facecolor(bg)
    axes = axes.ravel()
    for i, ax in enumerate(axes):
        ax.set_facecolor(bg)
        ax.axis('off')
        if i < len(names):
            try:
                img = mpimg.imread(names[i] + '.png')
                ax.imshow(img)
            except Exception:
                pass
    plt.subplots_adjust(left=0.02, right=0.98, top=0.98, bottom=0.02, wspace=0.08, hspace=0.08)
    fig.savefig('axis_reference_grid.png', facecolor=fig.get_facecolor(), bbox_inches='tight', pad_inches=0)
    fig.savefig('axis_reference_grid.svg', facecolor=fig.get_facecolor(), bbox_inches='tight', pad_inches=0)
    plt.close(fig)
    print("参考拼图已保存到: axis_reference_grid.png, axis_reference_grid.svg")

if __name__ == "__main__":
    # 生成标准图标
    create_3d_axis_icon()
    
    # 生成多种格式
    create_multiple_styles()
    
    # 生成突出某一轴的三张图
    create_focus_variants()

    # 生成XYZ都半透明 + 三条不同目标虚线的三张图
    create_all_dim_with_guides()

    # 生成XYZ都半透明 + 平行四边形面片的三张图
    create_parallelogram_variants()

    # 生成XYZ都半透明 + 对角+轴向组合面片的三张图
    create_parallelogram_variants_composite()

    # 生成XYZ都半透明 + 空间对角线与三条虚线
    create_space_diagonal_variant()

    # 生成参考拼图（四排淡灰背景）
    create_reference_grid()
